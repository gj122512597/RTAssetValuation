import { useMemo } from 'react';
import {
  Card,
  Tag,
  Table,
  Statistic,
  Row,
  Col,
  Empty,
  Tooltip,
} from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { Asset, Transaction } from '@/types';
import { EmptyState } from '@/components/common/StateViews';

interface Props {
  asset: Asset;
}

const STATUS_TAG: Record<Transaction['status'], { label: string; color: string }> = {
  new: { label: '签约', color: 'blue' },
  renewal: { label: '续约', color: 'cyan' },
  handover: { label: '接手', color: 'default' },
};

const PERF_TAG: Record<Transaction['performance'], { label: string; color: string }> = {
  good: { label: '良好', color: 'green' },
  early_exit: { label: '提前退租', color: 'orange' },
  overdue: { label: '逾期', color: 'red' },
};

/**
 * 历史成交趋势卡（M5 业务升级）
 *  - 顶部 LineChart：7 年价格走势（X=日期，Y=元/㎡·天）
 *  - 顶部统计：平均涨幅 / 当前价 vs 首笔 / 总成交量
 *  - 底部表格：每笔明细（按时间倒序）
 */
export default function HistoryTrendCard({ asset }: Props) {
  const txs = asset.historical_transactions ?? [];

  const data = useMemo(
    () =>
      txs.map((t) => ({
        date: t.date,
        price: t.price_per_m2,
        status: t.status,
        performance: t.performance,
      })),
    [txs]
  );

  if (txs.length === 0) {
    return (
      <Card title="历史成交轨迹" size="small" className="!shadow-card">
        <EmptyState
          compact
          icon="📜"
          description="暂无历史成交记录"
          hint="该资产可能新近接收或无可用 ERP 历史"
        />
      </Card>
    );
  }

  // 排序：date 升序
  const sorted = useMemo(() => [...txs].sort((a, b) => a.date.localeCompare(b.date)), [txs]);
  const sortedDesc = useMemo(() => [...sorted].reverse(), [sorted]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalVolume = sorted.reduce((s, t) => s + t.price_per_m2 * asset.area * 30 * t.lease_term_months, 0);
  const annualIncrement =
    last.price_per_m2 > first.price_per_m2 && sorted.length > 1
      ? (Math.pow(last.price_per_m2 / first.price_per_m2, 1 / Math.max(1, sorted.length - 1)) - 1) * 100
      : 0;

  const chartData = sorted.map((t) => ({
    date: t.date.slice(2), // 显示两位年份
    price: t.price_per_m2,
  }));

  // 平均租期 / 平均免租
  const avgTerm = Math.round(
    sorted.reduce((s, t) => s + t.lease_term_months, 0) / sorted.length
  );
  const avgFreeRent = Math.round(
    sorted.reduce((s, t) => s + t.free_rent_days, 0) / sorted.length
  );

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>历史成交轨迹</span>
          <Tag color="default" bordered={false}>
            {sorted.length} 笔 · 2019 ~ 2026
          </Tag>
        </div>
      }
      size="small"
      className="!shadow-card"
    >
      {/* 顶部 4 列统计 */}
      <Row gutter={[12, 12]} className="!mb-3">
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">首笔价格</span>}
            value={first.price_per_m2}
            precision={2}
            suffix={<span className="text-xs">元/㎡·天</span>}
            valueStyle={{ fontSize: 16 }}
          />
          <div className="text-[11px] text-ink-500 mt-0.5">{first.date}</div>
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">最新价格</span>}
            value={last.price_per_m2}
            precision={2}
            suffix={<span className="text-xs">元/㎡·天</span>}
            valueStyle={{ fontSize: 16, color: '#1f6feb' }}
          />
          <div className="text-[11px] text-ink-500 mt-0.5">
            {last.date}
            {annualIncrement > 0 ? (
              <span className="text-success ml-1">
                <ArrowUpOutlined /> {annualIncrement.toFixed(1)}%/笔
              </span>
            ) : (
              <span className="text-danger ml-1">
                <ArrowDownOutlined /> {(0 - annualIncrement).toFixed(1)}%
              </span>
            )}
          </div>
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">平均租期 / 免租</span>}
            value={`${avgTerm} 月 / ${avgFreeRent} 天`}
            valueStyle={{ fontSize: 14 }}
          />
          <div className="text-[11px] text-ink-500 mt-0.5">
            押金 {first.deposit_months} 押{pickFirstDeposit(sorted)}付
          </div>
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">累计成交额</span>}
            value={(totalVolume / 1e8).toFixed(2)}
            suffix={<span className="text-xs">亿元</span>}
            precision={2}
            valueStyle={{ fontSize: 16 }}
          />
          <div className="text-[11px] text-ink-500 mt-0.5">按当前面积估算</div>
        </Col>
      </Row>

      {/* 折线图 */}
      <div style={{ width: '100%', height: 180 }} className="!mt-2">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" />
            <YAxis
              fontSize={10}
              stroke="#94a3b8"
              domain={['dataMin - 0.3', 'dataMax + 0.3']}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <RechartsTooltip
              formatter={(v: number) => `¥${v.toFixed(2)}`}
              labelFormatter={(l) => `日期 ${l}`}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine
              y={asset.estimated_price}
              stroke="#1f6feb"
              strokeDasharray="4 3"
              label={{
                value: '当前估价',
                position: 'right',
                fill: '#1f6feb',
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#1f6feb"
              strokeWidth={2}
              dot={{ fill: '#1f6feb', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 明细表（按时间倒序） */}
      <div className="!mt-3">
        <div className="text-xs text-ink-500 mb-1.5">明细（{sorted.length} 笔 · 按时间倒序）</div>
        <Table<Transaction>
          size="small"
          rowKey="id"
          pagination={false}
          scroll={{ y: 240 }}
          dataSource={sortedDesc}
          columns={[
            {
              title: '成交日期',
              dataIndex: 'date',
              key: 'date',
              width: 100,
              fixed: 'left',
            },
            {
              title: '价格',
              dataIndex: 'price_per_m2',
              key: 'price_per_m2',
              width: 90,
              align: 'right',
              render: (v: number, record) => {
                const isLast = record.id === last.id;
                return (
                  <span className={isLast ? 'font-semibold text-brand' : ''}>
                    ¥{v}
                  </span>
                );
              },
            },
            {
              title: '租客',
              dataIndex: 'tenant',
              key: 'tenant',
              width: 180,
              render: (v: string) => <span className="text-ink-700">{v}</span>,
            },
            {
              title: '租期',
              dataIndex: 'lease_term_months',
              key: 'lease_term_months',
              width: 80,
              align: 'center',
              render: (v: number) => `${v} 月`,
            },
            {
              title: '免租',
              dataIndex: 'free_rent_days',
              key: 'free_rent_days',
              width: 70,
              align: 'center',
              render: (v: number) => `${v} 天`,
            },
            {
              title: '押付',
              key: 'deposit',
              width: 80,
              align: 'center',
              render: (_v, r) => `押${r.deposit_months} 付1`,
            },
            {
              title: '递增',
              dataIndex: 'annual_increment_pct',
              key: 'annual_increment_pct',
              width: 80,
              align: 'center',
              render: (v: number) => <Tag color="blue" bordered={false}>+{v}%/年</Tag>,
            },
            {
              title: '类型',
              dataIndex: 'status',
              key: 'status',
              width: 70,
              align: 'center',
              render: (s: Transaction['status']) => (
                <Tag color={STATUS_TAG[s].color} bordered={false}>
                  {STATUS_TAG[s].label}
                </Tag>
              ),
            },
            {
              title: '履约',
              dataIndex: 'performance',
              key: 'performance',
              width: 80,
              align: 'center',
              render: (p: Transaction['performance']) => (
                <Tag color={PERF_TAG[p].color} bordered={false}>
                  {PERF_TAG[p].label}
                </Tag>
              ),
            },
            {
              title: '备注',
              dataIndex: 'notes',
              key: 'notes',
              render: (v?: string) =>
                v ? (
                  <Tooltip title={v}>
                    <span className="text-xs text-ink-500 truncate inline-block max-w-[160px]">
                      {v}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-xs text-ink-300">—</span>
                ),
            },
          ]}
        />
      </div>
    </Card>
  );
}

/** 简单 mock：取第一笔的押金月数 */
function pickFirstDeposit(txs: Transaction[]): string {
  if (txs.length === 0) return '?';
  return `${txs[0].deposit_months}`;
}