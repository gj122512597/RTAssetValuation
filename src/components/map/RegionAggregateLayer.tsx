import { useMemo } from 'react';
import { Marker } from 'react-map-gl';
import type { Asset } from '@/types';

/** 区域聚合层颜色：按均价分 5 档（与之前一致，定义在此组件内避免依赖 AssetMarker） */
const AGG_BUCKETS = ['#94a3b8', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
const AGG_LABELS = ['<1', '1-3', '3-6', '6-10', '≥10'];

function aggBucket(p: number) {
  if (p < 1) return 0;
  if (p < 3) return 1;
  if (p < 6) return 2;
  if (p < 10) return 3;
  return 4;
}

interface Props {
  assets: Asset[];
  onPickRegion?: (region: string) => void;
}

/**
 * 行政区域聚合层（M1）：
 *  - 按 region 字段将资产聚合到几何中心
 *  - 颜色：按区域均价落在 5 桶的哪一桶
 *  - 大小：区域内资产数量
 *  - 单击聚合圆 → onPickRegion（用于后续下钻视图）
 */
interface RegionAgg {
  region: string;
  count: number;
  vacant: number;
  avgPrice: number;
  center: [number, number];
  bucket: number;
}

function aggregate(assets: Asset[]): RegionAgg[] {
  const map = new Map<string, Asset[]>();
  for (const a of assets) {
    const list = map.get(a.region) ?? [];
    list.push(a);
    map.set(a.region, list);
  }
  const out: RegionAgg[] = [];
  for (const [region, list] of map.entries()) {
    const lng = list.reduce((s, a) => s + a.lnglat[0], 0) / list.length;
    const lat = list.reduce((s, a) => s + a.lnglat[1], 0) / list.length;
    const avgPrice = list.reduce((s, a) => s + a.estimated_price, 0) / list.length;
    out.push({
      region,
      count: list.length,
      vacant: list.filter((x) => x.status === 'vacant').length,
      avgPrice: Number(avgPrice.toFixed(2)),
      center: [lng, lat],
      bucket: aggBucket(avgPrice),
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export default function RegionAggregateLayer({ assets, onPickRegion }: Props) {
  const data = useMemo(() => aggregate(assets), [assets]);
  if (data.length === 0) return null;

  return (
    <>
      {data.map((d) => {
        const radius = 16 + Math.min(d.count, 10) * 2;
        const color = AGG_BUCKETS[d.bucket];
        return (
          <Marker
            key={d.region}
            longitude={d.center[0]}
            latitude={d.center[1]}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onPickRegion?.(d.region);
            }}
          >
            <div className="relative flex items-center justify-center cursor-pointer">
              <span
                className="absolute inline-flex rounded-full opacity-30"
                style={{
                  width: radius * 2.5,
                  height: radius * 2.5,
                  backgroundColor: color,
                }}
              />
              <span
                className="relative inline-flex items-center justify-center rounded-full text-white text-xs font-semibold ring-2 ring-white shadow-card"
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  backgroundColor: color,
                }}
              >
                {d.count}
              </span>
              <div
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-gray-700 bg-white/90 rounded px-1.5 py-0.5 shadow-sm pointer-events-none"
              >
                {d.region} · ¥{d.avgPrice}
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
