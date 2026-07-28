# -*- coding: utf-8 -*-
"""
手写内联 SVG 流程图生成器（零依赖、完全离线）。
替代 drawio 导出：文字对比度按背景亮度自动选黑/白，杜绝"方框无字"问题。
输出 5 张图：bizloop / sequence / syscontext / opstop（diagrams/） + arch（ppt 根目录）。
"""
import os, html

HERE = os.path.dirname(os.path.abspath(__file__))

C = {
    'navy':   '#163a5f', 'navy3':  '#1e4d7b', 'blue':   '#2f80ed',
    'teal':   '#14b8a6', 'cyan':   '#0e7490', 'gold':   '#e0a82e',
    'slate':  '#5b6b7b', 'green':  '#0a8a4a', 'ink':    '#1f2d3d',
    'white':  '#ffffff', 'line':   '#94a3b8',
}
FF = "-apple-system,'PingFang SC','Microsoft YaHei',Helvetica,Arial,sans-serif"

def esc(t): return html.escape(str(t))

def lum(hexc):
    hexc = hexc.lstrip('#')
    r, g, b = int(hexc[0:2], 16), int(hexc[2:4], 16), int(hexc[4:6], 16)
    def f(c):
        c /= 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def text_fill(bg):
    return '#ffffff' if lum(bg) < 0.40 else '#1f2d3d'

def shade(hexc):
    hexc = hexc.lstrip('#')
    r, g, b = int(hexc[0:2], 16), int(hexc[2:4], 16), int(hexc[4:6], 16)
    r, g, b = int(r * 0.68), int(g * 0.68), int(b * 0.68)
    return '#%02x%02x%02x' % (r, g, b)

def marker_defs():
    s = '<defs>'
    for k, c in C.items():
        if k in ('white', 'line', 'ink'):
            continue
        s += (f'<marker id="ar-{k}" viewBox="0 0 10 10" refX="8.5" refY="5" '
              f'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
              f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>')
    s += '</defs>'
    return s

def box(x, y, w, h, lines, fill, rx=10, sw=1.6):
    """lines: list of (text, fontsize, weight)"""
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" ry="{rx}" '
         f'fill="{fill}" stroke="{shade(fill)}" stroke-width="{sw}"/>')
    tf = text_fill(fill)
    lh = [ln[1] * 1.32 for ln in lines]
    total = sum(lh)
    cy = y + h / 2 - total / 2 + lh[0] / 2
    cx = x + w / 2
    for i, (t, sz, wt) in enumerate(lines):
        s += (f'<text x="{cx:.0f}" y="{cy:.0f}" fill="{tf}" font-size="{sz}" '
              f'font-weight="{wt}" text-anchor="middle" dominant-baseline="middle">'
              f'{esc(t)}</text>')
        cy += lh[i]
    return s

def text_width(t, fs):
    """近似文本渲染宽度：CJK 按 1em，半角按 0.55em。"""
    w = 0.0
    for ch in str(t):
        w += fs if ord(ch) > 0x2E80 else fs * 0.55
    return w

def conn(points, label='', color='navy', dash=False, fs=11, lc='#33424f', loff=0, lt=0.5):
    """points: list of (x,y). 折线 + 箭头。
    loff: 标签沿末段法线方向偏移；lt: 标签沿末段位置(0=起,1=止,0.5=中点)。
    标签带白底圆角衬底，确保在深色框/箭头上也可读。"""
    d = 'M' + ' L'.join(f'{px},{py}' for px, py in points)
    dash_attr = 'stroke-dasharray="6 6" ' if dash else ''
    s = (f'<path d="{d}" fill="none" stroke="{C[color]}" stroke-width="2" {dash_attr}'
         f'marker-end="url(#ar-{color})"/>')
    if label:
        x1, y1 = points[-2]
        x2, y2 = points[-1]
        mx = x1 + (x2 - x1) * lt
        my = y1 + (y2 - y1) * lt
        dx, dy = x2 - x1, y2 - y1
        L = (dx * dx + dy * dy) ** 0.5 or 1.0
        lx = mx + (-dy / L) * loff
        ly = my + (dx / L) * loff
        tw = text_width(label, fs)
        w = tw + 12
        h = fs + 7
        s += (f'<rect x="{lx - w / 2:.1f}" y="{ly - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" '
              f'rx="4" ry="4" fill="#ffffff" fill-opacity="0.94" stroke="#cdd7e3" stroke-width="1"/>')
        s += (f'<text x="{lx:.1f}" y="{ly:.1f}" fill="{lc}" font-size="{fs}" '
              f'text-anchor="middle" dominant-baseline="middle" font-weight="600">{esc(label)}</text>')
    return s

def bidir(A, B, l1, l2, c1='cyan', c2='teal', dash2=True, sep=22, fs=10, lc='#33424f', lt=0.25):
    """双向箭头：两条线沿法向错开 sep 像素（看起来是一对平行箭头），
    标签1 贴在线1 的 A 端、标签2 贴在线2 的 B 端（沿箭头方向错开 lt），彻底避免压字。
    A,B 为 (x,y) 端点。"""
    ax, ay = A
    bx, by = B
    dx, dy = bx - ax, by - ay
    L = (dx * dx + dy * dy) ** 0.5 or 1.0
    h = sep / 2.0
    ox, oy = -dy / L * h, dx / L * h
    s = conn([(ax + ox, ay + oy), (bx + ox, by + oy)], label=l1, color=c1, fs=fs, lc=lc, lt=lt)
    s += conn([(bx - ox, by - oy), (ax - ox, ay - oy)], label=l2, color=c2, dash=dash2, fs=fs, lc=lc, lt=lt)
    return s

def svg(view_w, view_h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_w} {view_h}" '
            f'width="{view_w}" height="{view_h}" font-family="{FF}">'
            f'{marker_defs()}'
            f'<rect x="0" y="0" width="{view_w}" height="{view_h}" fill="#ffffff"/>'
            f'{body}</svg>')

# =========================================================
# 1. 端到端业务闭环 bizloop
# =========================================================
def bizloop():
    b = ''
    W, H = 158, 74
    top = [('① 找标的 / 资产盘点', '#2f80ed'), ('② 智能估值', '#14b8a6'),
           ('③ 竞品对标', '#1e4d7b'), ('④ 尽职调查', '#0e7490'), ('⑤ 投决 / 报告', '#e0a82e')]
    xs = [15, 200, 385, 570, 755]
    for (x, (title, col)) in zip(xs, top):
        b += box(x, 90, W, H, [(title, 13, '700')], col)
    # 顶部横向箭头
    for i in range(4):
        b += conn([(xs[i] + W, 127), (xs[i + 1] - 4, 127)], color='slate')
    # ⑥ 数据沉淀与模型迭代
    b += box(290, 215, 360, 58,
             [('⑥ 数据沉淀与模型迭代', 13, '700'),
              ('估值 / 竞品 / 成交数据回流，驱动模型持续迭代', 11, '400')], '#5b6b7b')
    # ⑤ -> ⑥ 数据回流
    b += conn([(834, 164), (834, 244), (652, 244)], label='数据回流', color='navy')
    # ⑥ -> ② 模型迭代
    b += conn([(290, 244), (279, 244), (279, 164)], label='模型迭代', color='navy')
    return svg(940, 300, b)

# =========================================================
# 2. 新资产估价调用时序 sequence
# =========================================================
def sequence():
    VW, VH = 960, 560
    parts = [('前端应用', 'React SPA'), ('模型服务', 'Express'), ('Hedonic 系数库', 'SQLite'),
             ('竞品检索', 'REST API'), ('SHAP 解释', '可解释层')]
    px = [90, 290, 490, 690, 870]
    b = ''
    # 参与者头部
    for x, (t, sub) in zip(px, parts):
        b += box(x - 80, 22, 160, 40, [(t, 13, '700'), (sub, 10.5, '400')], '#1e4d7b')
    # 生命线
    for x in px:
        b += f'<line x1="{x}" y1="64" x2="{x}" y2="520" stroke="{C["line"]}" stroke-width="1.5" stroke-dasharray="4 4"/>'
    msgs = [
        (0, 1, '① 录入特征 · POST /predict'),
        (1, 2, '② 读取 Hedonic 系数'),
        (2, 1, '③ 系数返回'),
        (1, 3, '④ GET /competitors(经纬度,半径)'),
        (3, 1, '⑤ 周边竞品列表'),
        (1, 4, '⑥ 计算边际贡献'),
        (4, 1, '⑦ SHAP 贡献拆解'),
        (1, 0, '⑧ 建议日租金(中心+区间)+置信度'),
    ]
    y = 110
    for (a, c, label) in msgs:
        x1, x2 = px[a], px[c]
        col = 'teal' if a < c else 'gold'
        b += conn([(x1, y), (x2, y)], label=label, color=col, fs=11)
        y += 50
    return svg(VW, VH, b)

# =========================================================
# 3. 系统上下文 syscontext
# =========================================================
def syscontext():
    b = ''
    actors = [('业务负责人', '投决 / 资管 / 尽调'), ('技术负责人', '架构 / 数据 / 模型'),
              ('决策层', '战略 / 审批')]
    ay = [150, 220, 290]
    for (t, sub), y in zip(actors, ay):
        b += box(40, y - 32, 210, 64, [(t, 13, '700'), (sub, 11, '400')], '#14b8a6')
        b += conn([(250, y), (348, y)], label='使用 / 录入', color='navy')
    b += box(350, 110, 260, 210,
             [('AI 资产估值', 18, '700'), ('Demo平台', 18, '700'), ('(系统边界)', 12, '400')], '#1e4d7b')
    ext = [('爬虫数据源', '贝壳 / 58 / 链家 / 房天下'), ('政府公开数据', '权威口径'),
           ('宏观 GIS / POI', '区位与配套')]
    ey = [140, 230, 320]
    for (t, sub), y in zip(ext, ey):
        b += box(690, y - 32, 210, 64, [(t, 13, '700'), (sub, 11, '400')], '#2f80ed')
        b += conn([(612, y), (690, y)], label='爬取 / 读取', color='navy')
    return svg(940, 420, b)

# =========================================================
# 4. 部署架构 opstop
# =========================================================
def opstop():
    b = ''
    b += box(360, 20, 220, 52, [('用户浏览器', 13, '700'), ('Chrome / Edge', 11, '400')], '#5b6b7b')
    b += box(320, 100, 300, 52, [('Nginx', 13, '700'), ('反向代理 + 静态托管 (80/443)', 11, '400')], '#e0a82e')
    b += box(110, 185, 360, 70, [('前端 SPA', 13, '700'), ('Docker 多阶段镜像 · nginx 托管', 11, '400')], '#2f80ed')
    b += box(470, 185, 360, 70, [('后端 Express', 13, '700'), ('Docker · REST API :3001', 11, '400')], '#1e4d7b')
    b += box(110, 300, 360, 70, [('SQLite', 13, '700'), ('9 表 + 1 视图 · 全 CRUD', 11, '400')], '#14b8a6')
    b += box(470, 300, 360, 70, [('模型服务', 13, '700'), ('Hedonic 定价 + SHAP 解释', 11, '400')], '#0e7490')
    b += box(320, 410, 300, 50, [('爬虫 / 政府 · 宏观数据', 12.5, '700')], '#0a8a4a')
    # arrows（双向成对用 bidir 错开，避免实线/虚线标签压字）
    b += conn([(470, 72), (470, 98)], label='HTTPS', color='slate')
    b += conn([(420, 152), (300, 183)], label='静态', color='slate', loff=-12)
    b += conn([(520, 152), (640, 183)], label='反向代理 /api', color='slate', loff=-12)
    b += conn([(290, 255), (290, 298)], label='页面/状态', color='navy', loff=-12)
    b += bidir((650, 255), (650, 298), '定价请求/读写', 'SHAP 贡献', 'navy', 'teal', dash2=True, sep=22, fs=10)
    b += conn([(650, 370), (600, 408)], label='爬取 / 读取', color='green')
    return svg(940, 470, b)

# =========================================================
# 5. 总体架构 arch
# =========================================================
def arch():
    b = ''
    roles = [('业务负责人', '投决/资管/尽调'), ('技术负责人', '架构/数据/模型'), ('决策层', '战略/决策')]
    ry = [90, 160, 230]
    for (t, sub), y in zip(roles, ry):
        b += box(30, y - 28, 120, 56, [(t, 12, '700'), (sub, 9.5, '400')], '#14b8a6')
        b += conn([(150, y), (188, y)], label='使用', color='navy', fs=10)
    b += box(190, 70, 210, 110,
             [('前端应用层', 14, '700'),
              ('React 18 + TS + 高德 AMap', 11, '400'),
              ('Ant Design + Recharts + Zustand', 11, '400'),
              ('Dashboard·详情·估价·尽调', 11, '400')], '#2f80ed')
    b += box(430, 70, 210, 110,
             [('数据后端层', 14, '700'),
              ('SQLite + Express', 11, '400'),
              ('9 表 + 1 视图', 11, '400'),
              ('REST API (端口 3001)', 11, '400')], '#1e4d7b')
    b += box(670, 50, 240, 130,
             [('数据来源（外部）', 14, '700'),
              ('内部 ERP', 10.5, '400'),
              ('爬虫：贝壳/58/链家/房天下', 10.5, '400'),
              ('宏观 GIS / POI', 10.5, '400'),
              ('政府公开数据', 10.5, '400')], '#e0a82e')
    b += box(300, 290, 380, 70,
             [('AI 模型层', 14, '700'),
              ('Hedonic 对数线性回归 + SHAP 可解释', 11, '400'),
              ('市场比较法 R²≈0.92 · 历史数据法 R²≈0.85', 11, '400')], '#0e7490')
    # arrows（双向成对用 bidir 错开：两条平行线 + 标签分居两端，不再压字）
    b += conn([(400, 125), (428, 125)], label='REST API 调用', color='navy', fs=10, loff=-13)
    b += conn([(640, 95), (668, 90)], label='爬取/写入', color='navy', fs=10, loff=-13)
    b += conn([(640, 155), (668, 165)], label='读取/入库', color='navy', fs=10, loff=13)
    # 前端 ↔ AI 模型
    b += bidir((390, 180), (435, 290), '定价请求', 'SHAP 贡献', 'cyan', 'teal', dash2=True, sep=22, fs=10)
    # 后端 ↔ AI 模型
    b += bidir((560, 180), (600, 290), '模型系数', '系数返回', 'cyan', 'teal', dash2=True, sep=22, fs=10)
    return svg(940, 380, b)

# =========================================================
if __name__ == '__main__':
    out = {
        'diagrams/bizloop.svg':  bizloop(),
        'diagrams/sequence.svg': sequence(),
        'diagrams/syscontext.svg': syscontext(),
        'diagrams/opstop.svg':   opstop(),
        'arch.svg':              arch(),
    }
    for rel, content in out.items():
        p = os.path.join(HERE, rel)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(content)
        ntext = content.count('<text')
        print(f'written {rel:28s} bytes={len(content):5d} text={ntext}')
