/**
 * 热力图例（左下浮层）
 *   - 形态 → 状态（圆/方/菱 = 空置/在租/改造中）
 *   - 颜色 → 单价桶（PRD §1.3 "颜色深浅代表预估租金单价"）
 *   - 大小 → 置信度（10~16 px）
 */
import { PRICE_BUCKETS } from './AssetMarker';

export default function HeatLegend() {
  return (
    <div className="absolute left-4 bottom-12 z-10 bg-white/95 rounded-lg shadow-card px-3.5 py-2.5 text-xs space-y-2.5 max-w-[220px]">
      {/* 形态/状态 */}
      <div>
        <div className="font-semibold mb-1">形态 / 状态</div>
        <div className="space-y-1">
          {[
            { status: 'vacant', shape: 'circle', label: '空置' },
            { status: 'leased', shape: 'square', label: '在租' },
            { status: 'renovating', shape: 'diamond', label: '改造中' },
          ].map((it) => (
            <div key={it.status} className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24">
                {it.shape === 'circle' && (
                  <circle cx="12" cy="12" r="10" fill="#94a3b8" stroke="#c2410c" strokeWidth="2" />
                )}
                {it.shape === 'square' && (
                  <rect
                    x="2"
                    y="2"
                    width="20"
                    height="20"
                    rx="2"
                    fill="#94a3b8"
                    stroke="#15803d"
                    strokeWidth="2"
                  />
                )}
                {it.shape === 'diamond' && (
                  <polygon
                    points="12,2 22,12 12,22 2,12"
                    fill="#94a3b8"
                    stroke="#a16207"
                    strokeWidth="2"
                  />
                )}
              </svg>
              <span className="text-ink-700">{it.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 text-[10px] text-red-500">⚠ 空置 &gt; 90 天：红色闪烁</div>
      </div>

      <div className="border-t border-ink-100" />

      {/* 颜色 / 单价 */}
      <div>
        <div className="font-semibold mb-1">颜色 / 单价（元/㎡·天）</div>
        <div className="space-y-1">
          {PRICE_BUCKETS.map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded"
                style={{ background: b.color }}
              />
              <span className="text-ink-700">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-100" />

      {/* 大小 */}
      <div>
        <div className="font-semibold mb-1">大小：置信度</div>
        <div className="flex items-end gap-3 justify-start">
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="block rounded-full bg-ink-300"
              style={{ width: 10, height: 10 }}
            />
            <span className="text-[10px] text-ink-500">低</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="block rounded-full bg-ink-300"
              style={{ width: 14, height: 14 }}
            />
            <span className="text-[10px] text-ink-500">中</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="block rounded-full bg-ink-300"
              style={{ width: 18, height: 18 }}
            />
            <span className="text-[10px] text-ink-500">高</span>
          </div>
        </div>
      </div>
    </div>
  );
}