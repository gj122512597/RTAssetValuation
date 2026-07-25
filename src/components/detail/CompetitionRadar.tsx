import { useMemo } from 'react';
import { Card, Empty, Tag, Space, Table, Slider, Progress, Statistic, Row, Col } from 'antd';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { Asset, CompetitorForRadar } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { calcRadarForAssetVsComps, pickCompsInRadius } from '@/utils/shap';
import { toCompetitorForRadar } from '@/utils/competitorScoring';
import PriceDistributionHistogram from './PriceDistributionHistogram';

interface Props {
  asset: Asset;
}

/**
 * 竞品对标分析（M2 P2-3 + 详情页竞品联动）
 *  - 选择辐射半径（3/5 km）
 *  - 雷达：本资产 vs 圈内竞品均值（交通/配套/房龄/价格）
 *  - 列表：圈内核销楼盘，点击/hover 与地图双向联动
 *  - 选中或 hover 某竞品 → 显示其 AI 维度特征卡
 */
export default function CompetitionRadar({ asset }: Props) {
  const comps = useAssetStore((s) => s.competitors);
  const radius = useAssetStore((s) => s.compRadiusKm);
  const setRadius = useAssetStore((s) => s.setCompRadiusKm);
  const selectedCompetitorId = useAssetStore((s) => s.selectedCompetitorId);
  const hoveredCompetitorId = useAssetStore((s) => s.hoveredCompetitorId);
  const setSelectedCompetitorId = useAssetStore((s) => s.setSelectedCompetitorId);
  const setHoveredCompetitorId = useAssetStore((s) => s.setHoveredCompetitorId);

  /** 把爬虫原始竞品衍生为 CompetitorForRadar（含 AI 维度评分） */
  const allCompsForRadar = useMemo<CompetitorForRadar[]>(
    () => comps.map((c) => toCompetitorForRadar(c)),
    [comps]
  );

  const inRadius = useMemo(
    () => pickCompsInRadius(asset, allCompsForRadar, radius),
    [asset, allCompsForRadar, radius]
  );

  const data = useMemo(
    () => calcRadarForAssetVsComps(asset, inRadius),
    [asset, inRadius]
  );

  const radarData = useMemo(
    () => [
      { axis: '交通', mine: data.mine.交通, comp: data.compAvg.交通 },
      { axis: '配套', mine: data.mine.配套, comp: data.compAvg.配套 },
      { axis: '房龄', mine: data.mine.房龄, comp: data.compAvg.房龄 },
      { axis: '价格', mine: data.mine.价格, comp: data.compAvg.价格 },
    ],
    [data]
  );

  /** 当前展示的竞品（选中优先，否则 hover） */
  const focused =
    inRadius.find((c) => c.id === selectedCompetitorId) ??
    inRadius.find((c) => c.id === hoveredCompetitorId);

  const handleRowClick = (record: CompetitorForRadar) => {
    setSelectedCompetitorId(record.id);
  };
  const handleRowEnter = (record: CompetitorForRadar) => setHoveredCompetitorId(record.id);
  const handleRowLeave = () => setHoveredCompetitorId(null);

  return (
    <Card
      title={
        <Space>
          <span>竞品对标分析</span>
          <Tag color="purple" bordered={false}>{inRadius.length} 个圈内核销</Tag>
          {(selectedCompetitorId || hoveredCompetitorId) && (
            <Tag color="blue" bordered={false}>已联动地图</Tag>
          )}
        </Space>
      }
      size="small"
      className="!shadow-card"
      extra={
        <Space size="small">
          <span className="text-xs text-gray-500">辐射半径</span>
          <Slider
            min={1}
            max={10}
            value={radius}
            onChange={setRadius}
            marks={{ 3: '3km', 5: '5km', 10: '10km' }}
            style={{ width: 160 }}
          />
        </Space>
      }
    >
      {inRadius.length === 0 ? (
        <Empty description={`${radius}km 范围内无竞品`} />
      ) : (
        <>
          {/* ★ 价格分布直方图（业务升级：谈价场景核心） */}
          <PriceDistributionHistogram
            competitors={inRadius}
            selfPrice={asset.estimated_price}
          />

          {/* 左右并列：雷达 + 表格 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch mt-3">
            <div
              style={{ width: '100%', height: 240 }}
              className="border border-gray-100 rounded-md"
            >
              <ResponsiveContainer>
                <RadarChart data={radarData} outerRadius={70}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axis" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tickCount={6} fontSize={10} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Radar
                    name="竞品均值"
                    dataKey="comp"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.25}
                  />
                  <Radar
                    name="本资产"
                    dataKey="mine"
                    stroke="#1f6feb"
                    fill="#1f6feb"
                    fillOpacity={0.45}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={inRadius}
                rowClassName={(record) =>
                  record.id === selectedCompetitorId
                    ? 'rtv-row-selected'
                    : record.id === hoveredCompetitorId
                    ? 'rtv-row-hovered'
                    : ''
                }
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  onMouseEnter: () => handleRowEnter(record),
                  onMouseLeave: handleRowLeave,
                  style: { cursor: 'pointer' },
                })}
                columns={[
                  {
                    title: '楼盘',
                    dataIndex: 'name',
                    key: 'name',
                    width: '40%',
                    render: (_v, record) =>
                      record.id === selectedCompetitorId ? (
                        <span>
                          <span style={{ color: '#1f6feb', marginRight: 4 }}>●</span>
                          {record.name}
                        </span>
                      ) : (
                        record.name
                      ),
                  },
                  {
                    title: '挂牌价',
                    dataIndex: 'list_price',
                    key: 'list_price',
                    render: (_v, record) => `¥${Number(record.list_price ?? 0)}/㎡·天`,
                  },
                  {
                    title: '出租率',
                    dataIndex: 'occupancy_rate',
                    key: 'occupancy_rate',
                    render: (_v, record) =>
                      `${(Number(record.occupancy_rate ?? 0) * 100).toFixed(0)}%`,
                  },
                  {
                    title: '物业费',
                    dataIndex: 'property_fee',
                    key: 'property_fee',
                    render: (_v, record) => `¥${Number(record.property_fee ?? 0)}/㎡·月`,
                  },
                ]}
              />
            </div>
          </div>

          {/* 当前焦点竞品 - AI 特征详情 */}
          {focused && <CompetitorFeaturePanel c={focused} />}
        </>
      )}
    </Card>
  );
}

/**
 * 当前 focus 竞品的 AI 维度特征卡
 *  - 维度与 ai_features 一致（4 维评分）
 *  - 关键数字（商圈 / 距地铁 / 建成年份）
 */
function CompetitorFeaturePanel({ c }: { c: CompetitorForRadar }) {
  const scores = c.scores ?? {
    交通: 0,
    配套: 0,
    房龄: 0,
    价格: 0,
  };

  const tierColor =
    c.tier === 'A' ? 'red' : c.tier === 'B' ? 'orange' : 'default';

  return (
    <div
      className="mt-4 p-3 rounded-md border border-blue-200 bg-blue-50/40"
      data-testid="competitor-feature-panel"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
          <span className="font-semibold text-sm">AI 维度特征 · {c.name}</span>
          {c.tier && <Tag color={tierColor} bordered={false}>{c.tier} 级商圈</Tag>}
        </div>
        <span className="text-xs text-gray-400">点击行/地图可切换</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <ScoreBox label="交通" value={scores.交通} />
        <ScoreBox label="配套" value={scores.配套} />
        <ScoreBox label="房龄" value={scores.房龄} />
        <ScoreBox label="价格" value={scores.价格} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <StatisticItem
          label="业态"
          value={
            c.id
              ? c.name.includes('SOHO') || c.name.includes('大厦') || c.name.includes('中心')
                ? '写字楼'
                : c.name.includes('广场') || c.name.includes('底商')
                ? '商业'
                : '住宅'
              : ''
          }
        />
        <StatisticItem label="距地铁" value={c.subway_m != null ? `${c.subway_m} m` : '—'} />
        <StatisticItem label="建成年份" value={c.built_year ? `${c.built_year}` : '—'} />
        <StatisticItem
          label="物业费"
          value={c.property_fee != null ? `¥${c.property_fee}/㎡·月` : '—'}
        />
      </div>

      <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
        说明：4 维评分（0~10）由爬虫原始字段（list_price / property_fee / lnglat）经稳定映射模型推导，与本资产 ai_features 中的同维度评分严格对齐，可直接喂入 XGBoost / Few-shot 模型。
      </div>
    </div>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}</span>
      </div>
      <Progress
        percent={(value / 10) * 100}
        size="small"
        showInfo={false}
        strokeColor={color}
      />
    </div>
  );
}

function StatisticItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
