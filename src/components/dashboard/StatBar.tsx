import { Progress } from 'antd';
import type { ReactNode } from 'react';
import { HomeOutlined, AreaChartOutlined, RiseOutlined, DollarOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import { useMemo } from 'react';

/**
 * 聚合统计栏（M1 PRD §2 P1-2）：
 *   总资产数 / 总建面 / 平均出租率 / 本月预估租金收入 / AI 评估覆盖率
 */
export default function StatBar() {
  const assets = useAssetStore((s) => s.assets);

  const stats = useMemo(() => {
    if (assets.length === 0) {
      return {
        count: 0,
        totalArea: 0,
        avgOccupancy: 0,
        monthlyRevenue: 0,
        aiCoverage: 0,
      };
    }
    const totalArea = assets.reduce((s, a) => s + a.area, 0);
    const totalRevenue = assets.reduce((s, a) => s + (a.monthly_rent ?? 0), 0);
    const occupiedAssets = assets.filter((a) => a.status === 'leased');
    const avgOcc =
      occupiedAssets.length > 0
        ? occupiedAssets.reduce((s, a) => s + (a.occupancy_rate ?? 0), 0) /
          occupiedAssets.length
        : 0;
    const aiCovered = assets.filter((a) => a.confidence > 0).length;
    return {
      count: assets.length,
      totalArea,
      avgOccupancy: Number((avgOcc * 100).toFixed(1)),
      monthlyRevenue: totalRevenue,
      aiCoverage: Number(((aiCovered / assets.length) * 100).toFixed(1)),
    };
  }, [assets]);

  return (
    <div className="bg-white/95 rounded-lg shadow-card border border-gray-100 px-3 py-2 flex flex-wrap items-center gap-2 md:gap-4">
      {/* 主指标：资产总数（最核心） */}
      <div className="flex flex-col leading-none">
        <span className="text-[11px] text-ink-500 flex items-center gap-1">
          <HomeOutlined /> 资产总数
        </span>
        <span className="mt-1 text-2xl font-bold text-brand">
          {stats.count}
          <span className="ml-0.5 text-sm font-normal text-ink-400">处</span>
        </span>
      </div>

      <div className="hidden md:block h-9 w-px shrink-0 bg-gray-200" />

      {/* 主指标：本月预估收入 */}
      <div className="flex flex-col leading-none">
        <span className="text-[11px] text-ink-500 flex items-center gap-1">
          <DollarOutlined /> 本月预估收入
        </span>
        <span className="mt-1 text-xl font-bold text-ink-900">
          {stats.monthlyRevenue >= 1e8
            ? `${(stats.monthlyRevenue / 1e8).toFixed(1)}亿`
            : stats.monthlyRevenue >= 1e4
              ? `${(stats.monthlyRevenue / 1e4).toFixed(1)}万`
              : stats.monthlyRevenue.toLocaleString()}
          <span className="ml-0.5 text-xs font-normal text-ink-400">元</span>
        </span>
      </div>

      <div className="hidden md:block h-9 w-px shrink-0 bg-gray-200" />

      {/* 次级指标组 */}
      <div className="flex flex-1 items-center justify-around gap-3 min-w-0">
        <SubKpi
          icon={<AreaChartOutlined />}
          label="总建面"
          value={stats.totalArea}
          suffix="㎡"
        />
        <SubKpiProgress
          icon={<RiseOutlined />}
          label="平均出租率"
          value={stats.avgOccupancy}
          color="#22c55e"
        />
        <SubKpiProgress
          icon={<ExperimentOutlined />}
          label="AI 评估覆盖"
          value={stats.aiCoverage}
          color="#1f6feb"
        />
      </div>
    </div>
  );
}

/** 次级指标：数字 + 单位，弱化呈现 */
function SubKpi({
  icon,
  label,
  value,
  suffix,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="flex flex-col leading-none min-w-0">
      <span className="text-[11px] text-ink-500 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="mt-1 text-sm font-semibold text-ink-700 truncate">
        {value.toLocaleString()}
        <span className="ml-0.5 text-[10px] font-normal text-ink-400">{suffix}</span>
      </span>
    </div>
  );
}

/** 次级指标：百分比 + 细进度条 */
function SubKpiProgress({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col leading-none min-w-0">
      <span className="text-[11px] text-ink-500 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="mt-1 text-sm font-semibold text-ink-700">{value}%</span>
      <Progress
        percent={value}
        showInfo={false}
        size="small"
        strokeColor={color}
        className="!mt-1 !mb-0 w-16"
      />
    </div>
  );
}