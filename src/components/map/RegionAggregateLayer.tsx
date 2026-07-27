import { useMemo } from 'react';
import { Marker } from 'react-map-gl';
import type { Asset } from '@/types';
import { PRICE_BUCKETS } from './AssetMarker';

/** 区域聚合层颜色：按均价分 3 档，与 AssetMarker 的 PRICE_BUCKETS 完全统一 */
const AGG_BUCKETS = PRICE_BUCKETS.map((b) => b.color);
const AGG_LABELS = PRICE_BUCKETS.map((b) => b.label);

function aggBucket(p: number): number {
  const i = PRICE_BUCKETS.findIndex((b) => p >= b.min && p < b.max);
  return i < 0 ? 0 : i;
}

interface Props {
  assets: Asset[];
  onPickRegion?: (region: string) => void;
}

/**
 * 行政区域聚合层（M1）：
 *  - 按 region 字段将资产聚合到几何中心
 *  - 颜色：按区域均价落在 3 桶的哪一桶
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
