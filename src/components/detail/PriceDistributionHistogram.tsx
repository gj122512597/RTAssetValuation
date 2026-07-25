import { useMemo } from 'react';
import { Empty } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { CompetitorForRadar } from '@/types';

interface Props {
  competitors: CompetitorForRadar[];
  selfPrice: number;
}

/**
 * 竞品价格分布直方图（业务升级 #P0-①）
 *
 *  - 横轴：价格区间（5 档）
 *  - 纵轴：竞品数量
 *  - 红线：本资产当前估价
 *  - 用户一眼看到"我的定价在市场什么位置"
 */
export default function PriceDistributionHistogram({ competitors, selfPrice }: Props) {
  const data = useMemo(() => {
    if (competitors.length === 0) return null;
    const prices = competitors.map((c) => c.list_price).sort((a, b) => a - b);
    const min = Math.min(...prices, selfPrice);
    const max = Math.max(...prices, selfPrice);
    // 5 个区间
    const bucketCount = 5;
    const step = Math.max(0.5, (max - min) / bucketCount);
    const buckets: { range: string; min: number; max: number; count: number; selfIn: boolean }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const lo = min + i * step;
      const hi = i === bucketCount - 1 ? max + 0.001 : lo + step;
      const rangeLabel = `${lo.toFixed(1)}-${hi.toFixed(1)}`;
      buckets.push({
        range: rangeLabel,
        min: lo,
        max: hi,
        count: prices.filter((p) => p >= lo && p < hi).length,
        selfIn: selfPrice >= lo && selfPrice < hi,
      });
    }
    return { buckets, min, max, step };
  }, [competitors, selfPrice]);

  if (!data) return <Empty description="暂无竞品价格数据" />;

  // 找本资产所在区间
  const selfBucket = data.buckets.find((b) => b.selfIn);
  // 计算众数区间
  const maxCount = Math.max(...data.buckets.map((b) => b.count));
  const modeBucket = data.buckets.find((b) => b.count === maxCount);

  return (
    <div className="bg-blue-50/40 rounded-md p-2.5 border border-blue-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-ink-500">
          📊 {competitors.length} 个竞品价格分布
        </span>
        <span className="text-[11px] text-ink-500">
          {modeBucket && (
            <>
              众数区间 <b className="text-ink-700">{modeBucket.range}</b>
              <span className="ml-2">
                你的位置：
                {selfBucket ? (
                  <b className="text-brand">{selfBucket.range}</b>
                ) : (
                  <b className="text-warning">区间外</b>
                )}
              </span>
            </>
          )}
        </span>
      </div>
      <div style={{ width: '100%', height: 100 }}>
        <ResponsiveContainer>
          <BarChart data={data.buckets} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="range"
              fontSize={9}
              stroke="#94a3b8"
              interval={0}
              tick={{ fontSize: 9 }}
            />
            <YAxis fontSize={9} stroke="#94a3b8" width={20} />
            <RechartsTooltip
              formatter={(v: number) => [`${v} 个竞品`, '数量']}
              labelFormatter={(l) => `区间 ${l} 元/㎡·天`}
              contentStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.buckets.map((b, i) => (
                <Cell
                  key={i}
                  fill={b.selfIn ? '#1f6feb' : '#94a3b8'}
                  fillOpacity={b.selfIn ? 1 : 0.65}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}