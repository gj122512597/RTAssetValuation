#!/usr/bin/env python3
"""Convert a draw.io .drawio XML into a standalone animated SVG.

draw.io's browser export is unavailable in this environment, but its SVG output
is deterministic. This converter reproduces the essentials we need:
  - rounded rect vertices (fill/stroke/label)
  - orthogonal edges with arrows, dashed when style has `dashed=1`
  - a baked-in CSS flow animation on dashed edges (`animation=1`)
so the result is visually equivalent to draw.io export + the HTML's flow CSS.
"""
import sys, re, html
import xml.etree.ElementTree as ET

def parse_color(c):
    if not c: return None
    c = c.strip()
    return c if c.startswith('#') else '#' + c

def style_map(s):
    m = {}
    for kv in s.split(';'):
        if '=' in kv:
            k, v = kv.split('=', 1)
            m[k.strip()] = v.strip()
    return m

def esc(t):
    return html.escape(t)

def convert(path):
    tree = ET.parse(path); root = tree.getroot()
    model = root.find('.//mxGraphModel')
    pw = float(model.get('pageWidth', 800)); ph = float(model.get('pageHeight', 600))
    cells = {}
    for c in model.iter('mxCell'):
        cells[c.get('id')] = c

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {pw:.0f} {ph:.0f}" width="{pw:.0f}" height="{ph:.0f}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">']
    out.append('<style>@keyframes flow{to{stroke-dashoffset:-12}} .flow{stroke-dasharray:6 6;animation:flow .9s linear infinite}</style>')
    out.append(f'<rect x="0" y="0" width="{pw:.0f}" height="{ph:.0f}" fill="#ffffff"/>')

    # First pass: vertices
    for cid, c in cells.items():
        if c.get('vertex') != '1': continue
        g = c.find('mxGeometry'); 
        if g is None: continue
        sm = style_map(c.get('style',''))
        x=float(g.get('x',0)); y=float(g.get('y',0)); w=float(g.get('width',0)); h=float(g.get('height',0))
        # resolve parent-relative
        p=c.get('parent','1')
        while p not in ('0','1') and p in cells:
            pg=cells[p].find('mxGeometry')
            if pg is not None:
                x+=float(pg.get('x',0)); y+=float(pg.get('y',0))
            p=cells[p].get('parent','1')
        fill=parse_color(sm.get('fillColor'))
        stroke=parse_color(sm.get('strokeColor'))
        if stroke=='none': stroke=None
        if fill in (None,'none'): fill='none'
        dashed='dashed' in sm
        r='10' if 'rounded' in sm else '0'
        val=esc(c.get('value','') or '')
        fs=float(sm.get('fontSize','12'))
        fc=parse_color(sm.get('fontColor')) or '#000'
        fstyle='font-weight="bold"' if sm.get('fontStyle')=='1' else ''
        # container (dashed big box) no fill text top
        out.append(f'<g>')
        out.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{r}" ry="{r}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="1.5" stroke-dasharray="{"6 4" if dashed else "none"}"/>')
        # text
        ta=sm.get('align','center'); va=sm.get('verticalAlign','middle')
        tx = x+w/2 if ta=='center' else (x+6 if ta=='left' else x+w-6)
        ty = y+fs+6 if va=='top' else y+h/2
        anchor = 'middle' if ta=='center' else ('start' if ta=='left' else 'end')
        dom = 'start' if va=='top' else 'middle'
        lines = val.split('\n') if val else ['']
        lh = fs * 1.35
        start_y = ty - (len(lines) - 1) * lh / 2
        tspans = ''.join(
            f'<tspan x="{tx:.0f}" dy="{(start_y - ty if i == 0 else lh):.0f}">{esc(ln)}</tspan>'
            for i, ln in enumerate(lines)
        )
        out.append(f'<text fill="{fc}" font-size="{fs:.0f}" {fstyle} text-anchor="{anchor}" dominant-baseline="{dom}">{tspans}</text>')
        out.append('</g>')
    # Second pass: edges
    for cid, c in cells.items():
        if c.get('edge') != '1': continue
        sm=style_map(c.get('style',''))
        g=c.find('mxGeometry')
        src=c.get('source'); tgt=c.get('target')
        sx=sy=tx=ty=None
        def center(cid):
            cc=cells[cid]; cg=cc.find('mxGeometry'); 
            if cg is None: return None
            x=float(cg.get('x',0)); y=float(cg.get('y',0)); w=float(cg.get('width',0)); h=float(cg.get('height',0))
            p=cc.get('parent','1')
            while p not in ('0','1') and p in cells:
                pg=cells[p].find('mxGeometry')
                if pg is not None: x+=float(pg.get('x',0)); y+=float(pg.get('y',0))
                p=cells[p].get('parent','1')
            return x+w/2, y+h/2
        if src in cells: sx,sy=center(src)
        if tgt in cells: tx,ty=center(tgt)
        # explicit points override
        sp=g.find("mxPoint[@as='sourcePoint']") if g is not None else None
        tp=g.find("mxPoint[@as='targetPoint']") if g is not None else None
        if sp is not None: sx,sy=float(sp.get('x')),float(sp.get('y'))
        if tp is not None: tx,ty=float(tp.get('y')) if False else (float(tp.get('x')),float(tp.get('y')))
        if None in (sx,sy,tx,ty): continue
        # exit/entry offsets
        ex=float(sm.get('exitX','0.5')); ey=float(sm.get('exitY','0.5'))
        ix=float(sm.get('entryX','0.5')); iy=float(sm.get('entryY','0.5'))
        if src in cells:
            sg=cells[src].find('mxGeometry'); 
            bx=float(sg.get('x',0)); by=float(sg.get('y',0)); bw=float(sg.get('width',0)); bh=float(sg.get('height',0))
            p=cells[src].get('parent','1')
            while p not in ('0','1') and p in cells:
                pg=cells[p].find('mxGeometry')
                if pg is not None: bx+=float(pg.get('x',0)); by+=float(pg.get('y',0))
                p=cells[p].get('parent','1')
            sx=bx+bw*ex; sy=by+bh*ey
        if tgt in cells:
            tg=cells[tgt].find('mxGeometry')
            bx=float(tg.get('x',0)); by=float(tg.get('y',0)); bw=float(tg.get('width',0)); bh=float(tg.get('height',0))
            p=cells[tgt].get('parent','1')
            while p not in ('0','1') and p in cells:
                pg=cells[p].find('mxGeometry')
                if pg is not None: bx+=float(pg.get('x',0)); by+=float(pg.get('y',0))
                p=cells[p].get('parent','1')
        tx=bx+bw*ix; ty=by+bh*iy
        color=parse_color(sm.get('strokeColor')) or '#333'
        dash = ' flow' if sm.get('animation')=='1' else ''
        dash_attr='stroke-dasharray:6 6;' if sm.get('dashed')=='1' else ''
        # orthogonal-ish path: go out, then in
        midx=(sx+tx)/2
        d = f'M {sx:.0f} {sy:.0f} L {midx:.0f} {sy:.0f} L {midx:.0f} {ty:.0f} L {tx:.0f} {ty:.0f}'
        out.append(f'<path class="{dash.strip()}" d="{d}" fill="none" stroke="{color}" stroke-width="{sm.get("strokeWidth","2")}" style="{dash_attr}" marker-end="url(#arr)"/>')
        # label
        if c.get('value'):
            out.append(f'<text x="{midx:.0f}" y="{min(sy,ty)-4:.0f}" fill="{parse_color(sm.get("fontColor")) or color}" font-size="11" text-anchor="middle">{esc(c.get("value"))}</text>')

    out.append('<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#333"/></marker></defs>')
    out.append('</svg>')
    return '\n'.join(out)

if __name__=='__main__':
    src=sys.argv[1]; dst=sys.argv[2]
    open(dst,'w',encoding='utf-8').write(convert(src))
    print('wrote', dst)
