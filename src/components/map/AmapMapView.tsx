import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '@/stores/assetStore';
import { loadAMap, getAmapKey, getAmapSecurity } from '@/utils/amapEngine';
import { getPriceBucket } from './AssetMarker';
import type { Asset, CompetitorForRadar } from '@/types';

/**
 * 高德地图视图（v3 —— 修复"地图从未创建"的闭包陷阱）
 *
 * 重构要点：
 *   - 用 **callback ref + refs 持有 map**，避免 useState 异步导致 effect 闭包
 *     拿不到最新 containerEl。
 *   - 每个 useEffect 完全自治：
 *       · 创建地图 effect → 自己持有 mapRef 并 register cleanup
 *       · 绘制 marker / POI effect → 自己维护 created 列表 cleanup
 *   - safe* 工具函数兜底 AMap 二次销毁的异常。
 */

interface Props {
  focusAsset?: Asset;
  onMarkerClick: (asset: Asset) => void;
  detailMode?: boolean;
  detailRadiusKm?: number;
  detailCompetitors?: CompetitorForRadar[];
}

type AMapNS = typeof window.AMap;

const STATUS_COLOR: Record<Asset['status'], string> = {
  vacant: '#ef4444',
  leased: '#22c55e',
  renovating: '#f59e0b',
};

function safeRemove(map: any, target: any) {
  try {
    if (map && target && typeof map.remove === 'function') map.remove(target);
  } catch {
    /* ignore */
  }
}

function safeDestroy(map: any) {
  try {
    if (map && typeof map.destroy === 'function') map.destroy();
  } catch {
    /* ignore */
  }
}

function markerHTML(asset: Asset, opts: { selected: boolean; hovered: boolean }) {
  const fill = STATUS_COLOR[asset.status];
  const size = 10 + asset.confidence * 6;
  const isCritical = asset.status === 'vacant' && asset.days_vacant > 90;

  let shape = '';
  if (asset.status === 'leased') {
    shape = `<rect x="2" y="2" width="20" height="20" rx="2" fill="${fill}" stroke="white" stroke-width="2"/>`;
  } else if (asset.status === 'renovating') {
    shape = `<polygon points="12,2 22,12 12,22 2,12" fill="${fill}" stroke="white" stroke-width="2"/>`;
  } else {
    shape = `<circle cx="12" cy="12" r="10" fill="${fill}" stroke="white" stroke-width="2"/>`;
  }

  const labelStyle =
    opts.selected || opts.hovered
      ? 'background:#111;color:#fff;font-weight:600;border-radius:4px;padding:2px 6px;'
      : 'background:rgba(255,255,255,0.95);color:#333;border:1px solid #ddd;border-radius:4px;padding:1px 5px;';

  const ripple =
    opts.selected || isCritical
      ? `<span style="position:absolute;left:50%;top:50%;width:${
          size * 2.5
        }px;height:${
          size * 2.5
        }px;border-radius:50%;background:${fill};opacity:0.4;transform:translate(-50%,-50%);animation:rtv-ping 1.6s cubic-bezier(0,0,.2,1) infinite;"></span>`
      : '';

  return `
    <div style="position:relative;display:flex;align-items:center;cursor:pointer;transform:scale(${
      opts.selected || opts.hovered ? 1.1 : 1
    });">
      ${ripple}
      <svg width="${size * 2}" height="${size * 2}" viewBox="0 0 24 24" style="position:relative;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));">
        ${shape}
      </svg>
      <span style="${labelStyle}margin-left:6px;font-size:11px;line-height:1.4;white-space:nowrap;pointer-events:none;">
        ${asset.name} <span style="opacity:.6;font-size:10px;margin-left:2px;">¥${asset.estimated_price}</span>
      </span>
    </div>
    <style>@keyframes rtv-ping {75%,100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}</style>
  `;
}

function competitorHTML(
  name: string,
  price: number,
  occupancy: number,
  selected: boolean,
  hovered: boolean
) {
  const size = selected ? 14 : hovered ? 12 : 10;
  const ring = selected ? 'box-shadow:0 0 0 3px #2563eb, 0 0 0 5px #fff;' : 'box-shadow:0 0 0 1px #2563eb;';
  const labelBg = selected
    ? 'background:#1e3a8a;color:#fff;border-color:#1e3a8a;'
    : hovered
    ? 'background:#dbeafe;color:#1e3a8a;border-color:#60a5fa;'
    : 'background:rgba(255,255,255,0.97);color:#1e3a8a;border:1px solid #bae6fd;';

  return `
    <div title="${name} · ¥${price}/㎡·天 · 出租率 ${(occupancy * 100).toFixed(0)}%"
         style="display:flex;flex-direction:column;align-items:flex-start;cursor:pointer;line-height:1;">
      <div style="display:flex;align-items:center;padding:3px 7px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.15);${labelBg}">
        <span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:#2563eb;border:2px solid white;${ring}margin-right:6px;"></span>
        <span style="font-size:11px;font-weight:600;">${name}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:2px;padding-left:14px;font-size:10px;color:#475569;">
        <span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-weight:600;">¥${price}</span>
        <span style="background:#dcfce7;color:#15803d;border-radius:4px;padding:1px 5px;font-weight:600;">${(occupancy * 100).toFixed(0)}%</span>
      </div>
    </div>
  `;
}

/** 竞品特征 hover popup HTML */
function competitorTooltipHTML(c: CompetitorForRadar) {
  const scores = c.scores ?? { 交通: 0, 配套: 0, 房龄: 0, 价格: 0 };
  const colorBar = (v: number) =>
    v >= 7 ? '#22c55e' : v >= 5 ? '#f59e0b' : '#ef4444';
  const tierColor = c.tier === 'A' ? '#ef4444' : c.tier === 'B' ? '#f59e0b' : '#64748b';

  const scoreItem = (label: string, v: number) => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <span style="font-size:11px;color:#64748b;width:28px;">${label}</span>
      <div style="flex:1;margin:0 6px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
        <div style="width:${(v / 10) * 100}%;height:100%;background:${colorBar(v)};"></div>
      </div>
      <span style="font-size:11px;font-weight:600;color:${colorBar(v)};width:24px;text-align:right;">${v.toFixed(1)}</span>
    </div>`;

  return `
    <div style="font-family:-apple-system,sans-serif;line-height:1.4;width:240px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:600;color:#1e3a8a;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
        ${c.tier ? `<span style="font-size:10px;font-weight:600;color:#fff;background:${tierColor};padding:1px 6px;border-radius:8px;">${c.tier} 级商圈</span>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
        <span style="font-size:11px;color:#1d4ed8;background:#dbeafe;padding:2px 6px;border-radius:4px;font-weight:600;">¥${c.list_price}/㎡·天</span>
        <span style="font-size:11px;color:#15803d;background:#dcfce7;padding:2px 6px;border-radius:4px;font-weight:600;">${(c.occupancy_rate * 100).toFixed(0)}%</span>
      </div>
      <div style="border-top:1px dashed #cbd5e1;padding-top:6px;">
        ${scoreItem('交通', scores.交通)}
        ${scoreItem('配套', scores.配套)}
        ${scoreItem('房龄', scores.房龄)}
        ${scoreItem('价格', scores.价格)}
      </div>
      <div style="border-top:1px dashed #cbd5e1;margin-top:6px;padding-top:4px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;">
        <span>距地铁 ${c.subway_m ?? '—'}m</span>
        <span>建年 ${c.built_year ?? '—'}</span>
      </div>
      <div style="margin-top:6px;font-size:10px;color:#94a3b8;text-align:center;">点击 marker 锁定 · 移出关闭</div>
    </div>
  `;
}

/**
 * 创建 焦点资产 → 竞品 的对标折线（基于 AMap.Polyline）
 *  - 折线 (中点 + 法线偏移 30%) 让连线有自然弧度，避免 marker 遮挡
 *  - 蓝色虚线 stroke-dasharray=[4, 3]
 */
function makeRadialLine(AMap: any, from: [number, number], to: [number, number]) {
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.hypot(dx, dy) || 0.0001;
  const offset = len * 0.3;
  const mx = (fx + tx) / 2;
  const my = (fy + ty) / 2;
  const nx = -dy / len;
  const ny = dx / len;
  // 二次贝塞尔曲线近似为 50 个线段
  const ctrlX = mx + nx * offset;
  const ctrlY = my + ny * offset;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    pts.push([
      u * u * fx + 2 * u * t * ctrlX + t * t * tx,
      u * u * fy + 2 * u * t * ctrlY + t * t * ty,
    ]);
  }
  return new AMap.Polyline({
    path: pts,
    strokeColor: '#2563eb',
    strokeWeight: 1.6,
    strokeOpacity: 0.55,
    strokeDasharray: [4, 3],
    zIndex: 50,
  });
}

export default function AmapMapView({
  focusAsset,
  onMarkerClick,
  detailMode,
  detailRadiusKm,
  detailCompetitors,
}: Props) {
  const navigate = useNavigate();

  // refs（不变引用；可在 effect 间共享，不涉及 React state 同步问题）
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  // 仅 UI 触发 fallback 用
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedId = useAssetStore((s) => s.selectedAssetId);
  const selectedCompetitorId = useAssetStore((s) => s.selectedCompetitorId);
  const setSelectedCompetitorId = useAssetStore((s) => s.setSelectedCompetitorId);
  const hoveredCompetitorId = useAssetStore((s) => s.hoveredCompetitorId);
  const setHoveredCompetitorId = useAssetStore((s) => s.setHoveredCompetitorId);
  const allAssets = useAssetStore((s) => s.assets);
  const selectedBusinessTypes = useAssetStore((s) => s.selectedBusinessTypes);
  const selectedBatches = useAssetStore((s) => s.selectedBatches);
  const selectedPriceBuckets = useAssetStore((s) => s.selectedPriceBuckets);
  const currentUser = useAssetStore((s) => s.currentUser);
  const poi = useAssetStore((s) => s.poi);
  const showMetro = useAssetStore((s) => s.showMetro);
  const showDistricts = useAssetStore((s) => s.showDistricts);
  const setSelectedId = useAssetStore((s) => s.setSelectedAssetId);

  const visibleAssets = useMemo(
    () =>
      allAssets.filter((a) => {
        if (selectedBusinessTypes.length > 0 && !selectedBusinessTypes.includes(a.type as never))
          return false;
        if (selectedBatches.length > 0 && !selectedBatches.includes(a.received_batch))
          return false;
        if (
          selectedPriceBuckets.length > 0 &&
          !selectedPriceBuckets.includes(getPriceBucket(a.estimated_price).label)
        )
          return false;
        if (currentUser.scope === 'region' && currentUser.region && a.region !== currentUser.region)
          return false;
        return true;
      }),
    [allAssets, selectedBusinessTypes, selectedBatches, selectedPriceBuckets, currentUser]
  );

  const center = useMemo<[number, number]>(
    () => (focusAsset ? focusAsset.lnglat : [116.4, 39.95]),
    [focusAsset]
  );

  const key = getAmapKey();
  const security = getAmapSecurity();

  // 1. 加载 AMap JS API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadAMap(key, security);
        if (cancelled) return;
        if (!res) {
          setError(key ? 'AMap 加载失败' : '未配置 VITE_AMAP_KEY');
          return;
        }
        setLoaded(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, security]);

  // 2. 创建 / 销毁地图实例
  //    关键：依赖 center + loaded。当 loaded=true 且 containerRef.current 已挂载时
  //    立刻创建 map（不靠 ref state 同步）。
  useEffect(() => {
    if (!loaded) return;
    const AMap = (window as Window).AMap as AMapNS | undefined;
    if (!AMap) return;
    const el = containerRef.current;
    if (!el) {
      // container 尚未挂载：用 MutationObserver 等待一次
      const id = window.setTimeout(() => {
        // 通过 setState 触发本 effect 重跑（依赖没变，所以不会自动跑；这是异常兜底）
        setLoaded((v) => v);
      }, 200);
      return () => window.clearTimeout(id);
    }

    const detailZoom = 14;
    const map = new (AMap as any).Map(el, {
      zoom: focusAsset ? detailZoom : 9.5,
      center: [center[0], center[1]],
      viewMode: '2D',
      mapStyle: 'amap://styles/normal',
      features: ['bg', 'point', 'road'],
    });
    mapRef.current = map;
    map.on('click', () => setSelectedId(null));

    // 详情模式：把焦点资产显式置于地图中心（zoom 收紧，资产更突出）
    if (focusAsset) {
      map.setZoomAndCenter(detailZoom, [focusAsset.lnglat[0], focusAsset.lnglat[1]]);
    }

    return () => {
      safeDestroy(map);
      mapRef.current = null;
    };
  }, [loaded, center[0], center[1], setSelectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. 绘制资产 markers —— 读 mapRef.current，独立创建 / 清理
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const AMap = (window as Window).AMap as AMapNS | undefined;
    if (!AMap) return;

    const created: any[] = [];

    if (detailMode && focusAsset && detailRadiusKm) {
      const circle = new (AMap as any).Circle({
        center: [focusAsset.lnglat[0], focusAsset.lnglat[1]],
        radius: detailRadiusKm * 1000,
        strokeColor: '#1f6feb',
        strokeWeight: 2,
        strokeOpacity: 0.85,
        fillColor: '#1f6feb',
        fillOpacity: 0.06,
        strokeDasharray: [6, 4],
      });
      map.add && map.add(circle);
      created.push(circle);

      const focusMarker = new (AMap as any).Marker({
        position: [focusAsset.lnglat[0], focusAsset.lnglat[1]],
        content: markerHTML(focusAsset, { selected: true, hovered: false }),
        zIndex: 200,
      });
      focusMarker.on('click', (e: any) => e?.event?.stopPropagation?.());
      map.add && map.add(focusMarker);
      created.push(focusMarker);

      detailCompetitors?.forEach((c) => {
        // 1. 从焦点资产到竞品的对标折线（蓝虚线 + 轻微弧形）
        const line = makeRadialLine(AMap, focusAsset.lnglat, c.lnglat);
        map.add && map.add(line);
        created.push(line);

        // 2. 竞品位置点（蓝色实心圆 + 名称/价位/出租率 label）
        const isSelected = c.id === selectedCompetitorId;
        const isHovered = c.id === hoveredCompetitorId;
        const m = new (AMap as any).Marker({
          position: [c.lnglat[0], c.lnglat[1]],
          content: competitorHTML(
            c.name,
            c.list_price,
            c.occupancy_rate ?? 0,
            isSelected,
            isHovered
          ),
          zIndex: isSelected ? 220 : 110,
          offset: new (AMap as any).Pixel(-7, -7),
        });

        // 点击 → setSelectedCompetitorId, flyTo, stop propagation
        m.on('click', (e: any) => {
          e?.event?.stopPropagation?.();
          setSelectedCompetitorId(c.id);
        });
        // 鼠标进入 → 同步表格高亮
        m.on('mouseover', () => setHoveredCompetitorId(c.id));
        m.on('mouseout', () => setHoveredCompetitorId(null));

        map.add && map.add(m);
        created.push(m);
      });

      // 选中 → flyTo
      if (selectedCompetitorId && detailCompetitors) {
        const sel = detailCompetitors.find((c) => c.id === selectedCompetitorId);
        if (sel && map.setZoomAndCenter) {
          map.setZoomAndCenter(15, [sel.lnglat[0], sel.lnglat[1]], false, 600);
        }
      }
    } else {
      visibleAssets.forEach((asset) => {
        const m = new (AMap as any).Marker({
          position: [asset.lnglat[0], asset.lnglat[1]],
          content: markerHTML(asset, {
            selected: asset.id === selectedId,
            hovered: false,
          }),
        });
        m.on('click', (e: any) => {
          e?.event?.stopPropagation?.();
          onMarkerClick(asset);
        });
        map.add && map.add(m);
        created.push(m);
      });
    }

    return () => {
      created.forEach((x) => safeRemove(map, x));
    };
  }, [
    loaded,
    visibleAssets,
    selectedId,
    onMarkerClick,
    detailMode,
    focusAsset,
    detailRadiusKm,
    detailCompetitors,
    selectedCompetitorId,
    hoveredCompetitorId,
    setSelectedCompetitorId,
    setHoveredCompetitorId,
  ]);

  // 4. POI（地铁 + 商圈）
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !poi) return;
    const AMap = (window as Window).AMap as AMapNS | undefined;
    if (!AMap) return;

    const overlays: any[] = [];

    if (showMetro) {
      poi.metro.forEach((line) => {
        const path = line.coordinates.map((p) => [p[0], p[1]] as [number, number]);
        const poly = new (AMap as any).Polyline({
          path,
          strokeColor: line.color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
        });
        map.add && map.add(poly);
        overlays.push(poly);
      });
    }

    if (showDistricts) {
      poi.districts.forEach((d) => {
        const circle = new (AMap as any).Circle({
          center: [d.center[0], d.center[1]],
          radius: d.radius_km * 1000,
          strokeColor: d.level === 'A' ? '#f59e0b' : '#3b82f6',
          strokeWeight: 1.4,
          strokeOpacity: 0.7,
          fillColor: d.level === 'A' ? '#fbbf24' : '#60a5fa',
          fillOpacity: 0.1,
          strokeDasharray: [4, 3],
        });
        map.add && map.add(circle);
        overlays.push(circle);

        const txt = new (AMap as any).Marker({
          position: [d.center[0], d.center[1]],
          content: `<div style="font-size:11px;font-weight:600;color:#b45309;background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,0.1);">${d.name}</div>`,
        });
        map.add && map.add(txt);
        overlays.push(txt);
      });
    }

    return () => {
      overlays.forEach((o) => safeRemove(map, o));
    };
  }, [loaded, poi, showMetro, showDistricts]);

  // 6. 竞品 hover 浮层（AMap.InfoWindow）
  //    - 当 hoveredCompetitorId 变化时，在 marker 上方打开 InfoWindow
  //    - 当鼠标移开或竞品不在视野中，自动关闭
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !detailCompetitors) return;
    const AMapNS = (window as Window).AMap as AMapNS | undefined;
    if (!AMapNS) return;

    const iw = new (AMapNS as any).InfoWindow({
      content: '',
      offset: new (AMapNS as any).Pixel(0, -38),
      closeWhenClickMap: true,
    });

    if (!hoveredCompetitorId) {
      try {
        iw.close && iw.close();
      } catch {/* ignore */}
      return () => {
        try {
          iw.close && iw.close();
        } catch {/* ignore */}
      };
    }

    const c = detailCompetitors.find((x) => x.id === hoveredCompetitorId);
    if (!c) {
      try {
        iw.close && iw.close();
      } catch {/* ignore */}
      return () => {
        try {
          iw.close && iw.close();
        } catch {/* ignore */}
      };
    }

    try {
      iw.setContent(competitorTooltipHTML(c));
      iw.open(map, [c.lnglat[0], c.lnglat[1]]);
    } catch {/* ignore */}

    return () => {
      try {
        iw.close && iw.close();
      } catch {/* ignore */}
    };
  }, [loaded, hoveredCompetitorId, detailCompetitors]);

  // 5. callback ref —— DOM 挂载后立刻打日志（便于排查容器是否到位）
  const containerCallbackRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  // 6. Fallback 占位
  if (error || !loaded) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-lg p-6">
          <div className="text-5xl mb-3">🗺️</div>
          <div className="text-lg font-semibold mb-2">
            {error ?? '正在加载高德地图（AMap JS API v2.0）…'}
          </div>
          {!key ? (
            <>
              <p className="text-sm text-gray-500 mb-4 text-left">
                1. 访问{' '}
                <a
                  href="https://lbs.amap.com/api/jsapi-v2/guide/abc/prepare"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline"
                >
                  高德开放平台
                </a>{' '}
                申请 <b>Web 端 (JS API)</b> Key<br />
                2. 在项目根目录创建 <code className="px-1 bg-slate-200 rounded">.env</code>：
                <br />
                <code className="px-2 py-1 mt-1 inline-block bg-slate-200 rounded text-xs">
                  VITE_AMAP_KEY=你的key
                </code>
                <br />
                （可选）若启用了安全密钥，加上：
                <br />
                <code className="px-2 py-1 mt-1 inline-block bg-slate-200 rounded text-xs">
                  VITE_AMAP_SECURITY=你的安全码
                </code>
              </p>
              <button
                type="button"
                onClick={() => navigate('/asset/RZ-2023-021')}
                className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors text-sm"
              >
                先看一下非标资产详情（无需地图）
              </button>
            </>
          ) : (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return <div ref={containerCallbackRef} className="w-full h-full" />;
}
