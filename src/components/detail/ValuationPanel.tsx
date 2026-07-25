import { useMemo, useState } from 'react';
import {
  Card,
  Select,
  Slider,
  Checkbox,
  Tooltip,
  Button,
  Progress,
  Tag,
  Space,
  Alert,
  Statistic,
  Segmented,
  Row,
  Col,
  InputNumber,
} from 'antd';
import { ExperimentOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import type { Asset, DecorationLevel, PricingModel } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import {
  PRICING_MODEL_LABELS,
  calcValuation,
  type ValuationInput,
} from '@/utils/pricingModels';

interface ValuationPanelProps {
  asset: Asset;
  onOpenFormula: (model: PricingModel, input: ValuationInput) => void;
}

const DECO_OPTIONS: { value: DecorationLevel; label: string }[] = [
  { value: 'rough', label: '毛坯' },
  { value: 'simple', label: '简装' },
  { value: 'standard', label: '标准' },
  { value: 'fine', label: '精装' },
];

/**
 * 智能定价面板 v2（业务升级）
 *  - 4 列紧凑布局（业态/装修/免租/模型 + 双方法勾选）
 *  - 输出区加大：分位数参考 + 降价空间 slider + 估算月度/年度潜力
 *  - 谈价场景核心：实时输入"客户出价" → 系统给"是否合理"判定
 */
export default function ValuationPanel({ asset, onOpenFormula }: ValuationPanelProps) {
  const logic = useAssetStore((s) => s.valuationLogic);
  const pricingModel = useAssetStore((s) => s.pricingModel);
  const setPricingModel = useAssetStore((s) => s.setPricingModel);
  const modelsUsed = useAssetStore((s) => s.pricingModelsUsed);
  const toggleModelUsed = useAssetStore((s) => s.toggleModelUsed);

  const [decoration, setDecoration] = useState<DecorationLevel>(
    asset.decoration_level ?? 'standard'
  );
  const [freeRentDays, setFreeRentDays] = useState<number>(
    asset.default_free_rent_days ?? 30
  );
  const [businessType, setBusinessType] = useState<string>(asset.type);
  const [counterOffer, setCounterOffer] = useState<number | null>(null);

  const result = useMemo(() => {
    if (!logic) return null;
    return calcValuation(
      asset,
      logic,
      { businessType, decoration, freeRentDays },
      pricingModel
    );
  }, [asset, logic, businessType, decoration, freeRentDays, pricingModel]);

  /** 历史成交价格分位数（P25 / P50 / P75 / P90） */
  const percentiles = useMemo(() => {
    const txs = (asset.historical_transactions ?? [])
      .map((t) => t.price_per_m2)
      .sort((a, b) => a - b);
    if (txs.length === 0) return null;
    const q = (p: number) => {
      const idx = Math.min(txs.length - 1, Math.floor(p * txs.length));
      return txs[idx];
    };
    return {
      p25: q(0.25),
      p50: q(0.5),
      p75: q(0.75),
      p90: q(0.9),
      min: txs[0],
      max: txs[txs.length - 1],
      count: txs.length,
    };
  }, [asset.historical_transactions]);

  /** 计算当前估价在历史分位的"位置" */
  const currentPercentile = useMemo(() => {
    if (!percentiles || !result) return null;
    const txs = (asset.historical_transactions ?? []).map((t) => t.price_per_m2);
    if (txs.length === 0) return null;
    const below = txs.filter((p) => p <= result.final).length;
    return Math.round((below / txs.length) * 100);
  }, [percentiles, result, asset.historical_transactions]);

  /** 客户出价是否合理 */
  const counterVerdict = useMemo(() => {
    if (counterOffer == null || !result) return null;
    if (counterOffer < result.rangeLow * 0.9)
      return {
        level: 'low' as const,
        text: '低于建议区间下沿 10% 以上 · 建议拒绝',
        color: '#ef4444',
      };
    if (counterOffer < result.rangeLow)
      return {
        level: 'mid' as const,
        text: '低于建议区间下沿 · 可考虑但有合规风险',
        color: '#f59e0b',
      };
    if (counterOffer > result.rangeHigh * 1.1)
      return {
        level: 'high' as const,
        text: '高于建议区间上沿 10% 以上 · 难得的好价',
        color: '#22c55e',
      };
    return {
      level: 'good' as const,
      text: '在建议区间内 · 合理成交',
      color: '#22c55e',
    };
  }, [counterOffer, result]);

  if (!logic || !result) {
    return (
      <Card title="智能定价面板" size="small" className="!shadow-card">
        <Alert type="info" message="估值逻辑加载中…" />
      </Card>
    );
  }

  const inRange = (v: number) => v >= result.rangeLow && v <= result.rangeHigh;

  return (
    <Card
      title={
        <Space>
          <ExperimentOutlined />
          <span>智能定价面板</span>
          <Tag color="blue" bordered={false}>{result.modelLabel}</Tag>
        </Space>
      }
      size="small"
      className="!shadow-card"
      extra={
        <Button
          type="link"
          size="small"
          onClick={() =>
            onOpenFormula(pricingModel, { businessType, decoration, freeRentDays })
          }
        >
          查看推导过程 ›
        </Button>
      }
    >
      {/* 模型切换：当前生效 + 双方法勾选 */}
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs text-ink-500 mb-1">当前生效的定价方法</div>
          <Segmented<PricingModel>
            block
            value={pricingModel}
            onChange={(v) => setPricingModel(v)}
            options={(Object.keys(PRICING_MODEL_LABELS) as PricingModel[]).map((k) => ({
              label: PRICING_MODEL_LABELS[k],
              value: k,
            }))}
          />
        </div>
        <div>
          <div className="text-xs text-ink-500 mb-1">交叉验证</div>
          <Checkbox.Group
            value={modelsUsed}
            onChange={(vals) => {
              const set = new Set(vals as PricingModel[]);
              (Object.keys(PRICING_MODEL_LABELS) as PricingModel[]).forEach((m) => {
                if (set.has(m) && !modelsUsed.includes(m)) toggleModelUsed(m);
                else if (!set.has(m) && modelsUsed.includes(m)) toggleModelUsed(m);
              });
            }}
          >
            <Space direction="vertical" size={0}>
              {(Object.keys(PRICING_MODEL_LABELS) as PricingModel[]).map((m) => (
                <Checkbox key={m} value={m}>
                  <span className="text-xs">{PRICING_MODEL_LABELS[m]}</span>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </div>
      </div>

      {/* 输入区（紧凑单行） */}
      <div className="bg-ink-50 rounded-md p-3 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-ink-500 mb-1">业态</div>
            <Select
              className="w-full"
              value={businessType}
              options={[
                { value: 'office', label: '写字楼' },
                { value: 'retail', label: '商铺' },
                { value: 'hotel', label: '酒店' },
                { value: 'apartment', label: '公寓' },
                { value: 'plant', label: '厂房' },
                { value: 'warehouse', label: '仓库' },
              ]}
              onChange={setBusinessType}
            />
          </div>
          <div>
            <div className="text-xs text-ink-500 mb-1">装修</div>
            <Select
              className="w-full"
              value={decoration}
              options={DECO_OPTIONS}
              onChange={setDecoration}
            />
          </div>
          <div>
            <div className="text-xs text-ink-500 mb-1">
              免租期 <b className="text-brand">{freeRentDays} 天</b>
            </div>
            <Slider
              min={0}
              max={180}
              step={15}
              value={freeRentDays}
              onChange={setFreeRentDays}
              marks={{ 0: '0', 60: '2月', 120: '4月', 180: '半年' }}
            />
          </div>
        </div>
      </div>

      {/* 输出区：建议区间 + 分位数 + 月度/年度潜力 */}
      <div className="bg-gradient-to-br from-brand-50 to-slate-50 rounded-md p-3">
        <div className="text-center">
          <div className="text-xs text-ink-500">建议日租金</div>
          <div className="text-3xl font-bold text-brand leading-tight">
            ¥{result.rangeLow}
            <span className="text-sm text-ink-500 mx-1">~</span>
            ¥{result.rangeHigh}
          </div>
          <div className="text-[11px] text-ink-500 -mt-1">
            中心估 {result.final} · 不确定度 {(result.uncertainty * 100).toFixed(0)}%
            {currentPercentile !== null && (
              <span className="ml-2">
                · 历史分位 <b className="text-brand">P{currentPercentile}</b>
              </span>
            )}
          </div>
        </div>

        {/* 分位数参考（PRD §6 谈价场景核心） */}
        {percentiles && (
          <div className="mt-3 bg-white/70 rounded p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-ink-500">历史成交分位参考</span>
              <span className="text-[10px] text-ink-300">
                {percentiles.count} 笔 · 2019~2026
              </span>
            </div>
            <div className="relative h-7">
              {/* 渐变条 */}
              <div
                className="absolute top-2 left-0 right-0 h-2 rounded"
                style={{
                  background:
                    'linear-gradient(90deg, #94a3b8 0%, #7eb6f0 25%, #6dd1b3 50%, #f0c674 75%, #f08a8a 100%)',
                }}
              />
              {/* 当前估价标记 */}
              {currentPercentile !== null && (
                <div
                  className="absolute top-0 w-0.5 h-6 bg-ink-900"
                  style={{ left: `${currentPercentile}%` }}
                  title={`当前估价 P${currentPercentile}`}
                >
                  <div className="absolute -top-0.5 -translate-x-1/2 left-0 w-2 h-2 bg-ink-900 rounded-full" />
                </div>
              )}
              {/* 分位标签 */}
              <div className="absolute top-4 left-0 text-[10px] text-ink-500">
                P0 ¥{percentiles.min.toFixed(1)}
              </div>
              <div className="absolute top-4 right-0 text-[10px] text-ink-500">
                ¥{percentiles.max.toFixed(1)} P100
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-ink-500 mt-1 px-1">
              <span>P25 ¥{percentiles.p25.toFixed(1)}</span>
              <span>P50 ¥{percentiles.p50.toFixed(1)}</span>
              <span>P75 ¥{percentiles.p75.toFixed(1)}</span>
              <span>P90 ¥{percentiles.p90.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* 月度/年度潜力 */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Statistic
            title={<span className="text-[11px] text-ink-500">月租潜力</span>}
            value={Number((result.final * asset.area * 30).toFixed(0))}
            precision={0}
            prefix="¥"
            valueStyle={{ fontSize: 16 }}
          />
          <div>
            <div className="text-[11px] text-ink-500">年化潜力</div>
            <div className="text-base font-semibold">
              ¥{((result.final * asset.area * 365) / 1e4).toFixed(0)}万
            </div>
          </div>
        </div>

        {/* 置信度 */}
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-ink-500">
            <span>置信度</span>
            <span>{(result.confidence * 100).toFixed(0)}%</span>
          </div>
          <Progress
            percent={result.confidence * 100}
            size="small"
            strokeColor={
              result.confidence > 0.7
                ? '#22c55e'
                : result.confidence > 0.5
                ? '#f59e0b'
                : '#ef4444'
            }
          />
        </div>
      </div>

      {/* 降价空间测试：谈价场景 */}
      <div className="mt-3 border border-ink-100 rounded-md p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-ink-500">降价空间测试 · 输入客户出价</span>
          <Tooltip title="输入客户在谈的报价（元/㎡·天），系统给出是否在合理区间的判定">
            <InputNumber
              size="small"
              min={0}
              max={50}
              step={0.1}
              precision={2}
              prefix="¥"
              placeholder="如 7.5"
              value={counterOffer ?? undefined}
              onChange={(v) => setCounterOffer(v as number | null)}
              style={{ width: 110 }}
            />
          </Tooltip>
          {counterOffer !== null && (
            <Button
              size="small"
              type="text"
              onClick={() => setCounterOffer(null)}
            >
              清除
            </Button>
          )}
        </div>
        {counterVerdict && (
          <div
            className="text-xs px-2.5 py-1.5 rounded font-medium"
            style={{
              background: `${counterVerdict.color}15`,
              color: counterVerdict.color,
              border: `1px solid ${counterVerdict.color}30`,
            }}
          >
            {counterVerdict.text}
          </div>
        )}
      </div>

      {/* 与系统兜底估值的偏差 */}
      <div className="mt-2">
        <Alert
          showIcon
          type={inRange(asset.estimated_price) ? 'success' : 'warning'}
          className="!text-xs"
          message={
            inRange(asset.estimated_price)
              ? `系统兜底估值 ¥${asset.estimated_price} 落在建议区间内`
              : `系统兜底估值 ¥${asset.estimated_price} 偏离区间，建议人工复核`
          }
        />
        {result.confidence < 0.6 && (
          <Alert
            className="!mt-2 !text-xs"
            showIcon
            type="warning"
            message="置信度低于 60%，可能是数据稀疏，建议人工复核"
          />
        )}
      </div>
    </Card>
  );
}