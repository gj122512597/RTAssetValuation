import { Marker } from 'react-map-gl';
import clsx from 'clsx';
import type { Asset } from '@/types';
import { colors } from '@/styles/tokens';

interface AssetMarkerProps {
  asset: Asset;
  selected: boolean;
  hovered: boolean;
  onClick: (asset: Asset) => void;
  onHover?: (asset: Asset | null) => void;
}

/**
 * M1 PRD §1.3 设计：
 *   - 形状 = 资产状态（圆/方/菱） —— 视觉识别
 *   - 颜色 = 单价分桶（3 档） —— PRD "颜色深浅代表预估租金单价"
 *   - 大小 = 置信度（10~16 px）
 *
 * 形态色版：
 *   圆 (vacant)    → 价格桶主色
 *   方 (leased)    → 价格桶主色
 *   菱 (renovating) → 价格桶主色
 *
 * 状态警告（不靠颜色，靠形状 + 边框）：
 *   空置 > 90 天 → 红色 ping 闪烁
 */

// 单价 3 档（与左下角图例、资产概览、区域聚合层完全统一）
export const PRICE_BUCKETS = [
  { label: '<1', min: 0, max: 1, color: colors.priceBucket.ultraLow },
  { label: '1-10', min: 1, max: 10, color: colors.priceBucket.mid },
  { label: '≥10', min: 10, max: Infinity, color: colors.priceBucket.ultraHigh },
] as const;

export function getPriceBucket(p: number): (typeof PRICE_BUCKETS)[number] {
  return PRICE_BUCKETS.find((b) => p >= b.min && p < b.max) ?? PRICE_BUCKETS[0];
}

const STATUS_STROKE: Record<Asset['status'], string> = {
  vacant: '#c2410c',
  leased: '#15803d',
  renovating: '#a16207',
};

const STATUS_LABEL: Record<Asset['status'], string> = {
  vacant: '空置',
  leased: '在租',
  renovating: '改造中',
};

export default function AssetMarker({
  asset,
  selected,
  hovered,
  onClick,
  onHover,
}: AssetMarkerProps) {
  const fill = getPriceBucket(asset.estimated_price).color;
  const stroke = STATUS_STROKE[asset.status];
  const size = 10 + asset.confidence * 6;
  const isCritical = asset.status === 'vacant' && asset.days_vacant > 90;

  /** 形态分支（圆/方/菱） */
  const Shape = (() => {
    if (asset.status === 'leased') return 'square';
    if (asset.status === 'renovating') return 'diamond';
    return 'circle';
  })();

  const visualSize = hovered || selected ? size + 4 : size;
  const showLabel = hovered || selected;

  return (
    <Marker
      longitude={asset.lnglat[0]}
      latitude={asset.lnglat[1]}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(asset);
      }}
    >
      <div
        className={clsx(
          'relative flex items-center cursor-pointer transition-transform duration-150',
          (selected || hovered) && 'scale-110 z-10'
        )}
        onMouseEnter={() => onHover?.(asset)}
        onMouseLeave={() => onHover?.(null)}
        title={`${asset.name} · ${STATUS_LABEL[asset.status]} · ¥${asset.estimated_price}/㎡·天`}
      >
        {/* 红色高亮 ping（空置 > 90 天） */}
        {isCritical && (
          <span
            className="absolute inline-flex rounded-full opacity-50 animate-ping -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
            style={{
              width: visualSize * 2.5,
              height: visualSize * 2.5,
              backgroundColor: colors.status.vacant,
            }}
          />
        )}

        {/* 选中 ripple */}
        {selected && !isCritical && (
          <span
            className="absolute inline-flex rounded-full opacity-40 animate-ping -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
            style={{
              width: visualSize * 2.2,
              height: visualSize * 2.2,
              backgroundColor: fill,
            }}
          />
        )}

        {/* 形态本体（颜色按单价桶，描边按状态） */}
        <svg
          width={visualSize * 2}
          height={visualSize * 2}
          viewBox="0 0 24 24"
        >
          {Shape === 'circle' && (
            <circle cx="12" cy="12" r="10" fill={fill} stroke={stroke} strokeWidth="2" />
          )}
          {Shape === 'square' && (
            <rect x="2" y="2" width="20" height="20" rx="2" fill={fill} stroke={stroke} strokeWidth="2" />
          )}
          {Shape === 'diamond' && (
            <polygon
              points="12,2 22,12 12,22 2,12"
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
            />
          )}
        </svg>

        {/* 资产名 label —— 仅 hover/selected 时显示（zoom 较低时不显示，详见 legend） */}
        <span
          className={clsx(
            'absolute left-full ml-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] leading-none pointer-events-none transition-all',
            showLabel
              ? 'bg-ink-900 text-white font-semibold shadow-pop'
              : 'bg-white/90 text-ink-700 shadow-card border border-ink-100'
          )}
        >
          {asset.name}
          <span className="ml-1 text-[10px] opacity-75">¥{asset.estimated_price}</span>
        </span>
      </div>
    </Marker>
  );
}