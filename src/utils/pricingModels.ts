import type { Asset, DecorationLevel, PricingModel, ShapContribution, ValuationLogic } from '@/types';
import {
  HEDONIC_COMPARATIVE,
  HEDONIC_HISTORICAL,
  hedonicPredict,
  toComparableFeatureVector,
  toHistoricalFeatureVector,
  getFeatureMeta,
  type HedonicModel,
  type HedonicFeatureVector,
  type HedonicHistoricalVector,
  type ShapRow,
} from './hedonicModel';

export interface ValuationInput {
  businessType: string;
  decoration: DecorationLevel;
  freeRentDays: number;
}

export interface ValuationResult {
  model: PricingModel;
  final: number;
  rangeLow: number;
  rangeHigh: number;
  confidence: number;
  contributions: ShapContribution[];
  factors: Record<string, number>;
  modelLabel: string;
  uncertainty: number;
  methodNote: string;
}

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  comparative: '市场比较法',
  historical: '历史数据法',
};

export const PRICING_MODEL_NOTES: Record<PricingModel, string> = {
  comparative:
    '基于 12 维 Hedonic 特征 + 装修档位 + 免租期的对数线性回归（市场比较法）。',
  historical:
    '基于资产历史成交均价 + 装修 + 免租期的 4 维 Hedonic 回归（历史数据法），输出参考区间。',
};

export function reviewRiskScore(r: ValuationResult): number {
  return r.uncertainty;
}

const DECO_COEF: Record<DecorationLevel, number> = { rough: 0.78, simple: 0.88, standard: 1.0, fine: 1.18 };

/* ========== 统一入口：两个方法都走 Hedonic 回归 ========== */
export function calcValuation(
  asset: Asset,
  logic: ValuationLogic,
  input: ValuationInput,
  model: PricingModel
): ValuationResult {
  if (model === 'historical') {
    return hedonicHistoricalValuation(asset, logic, input);
  }
  return hedonicComparativeValuation(asset, logic, input);
}

/**
 * 把 hedonicPredict 返回的 ShapRow[] 转换为业务侧的 ShapContribution[]
 * 补充 feature_cn / explanation 以满足合规审计 + UI 渲染需求
 */
function enrichContributions(rows: ShapRow[]): ShapContribution[] {
  return rows.map((row) => {
    const meta = getFeatureMeta(row.feature);
    return {
      feature: row.feature,
      contribution: row.contribution,
      source: row.source,
      feature_cn: meta?.feature_cn ?? row.feature,
      explanation: meta?.description ?? 'Hedonic 模型自动计算的边际贡献',
    };
  });
}

/* ========== 市场比较法：12 维 Hedonic 回归 ========== */
function hedonicComparativeValuation(
  asset: Asset,
  _logic: ValuationLogic,
  input: ValuationInput
): ValuationResult {
  const x: HedonicFeatureVector = {
    ...toComparableFeatureVector(asset),
    decoration_idx: { rough: 0, simple: 1, standard: 2, fine: 3 }[input.decoration],
    free_rent_idx: Math.floor(input.freeRentDays / 15),
  };

  const { prediction, contributions } = hedonicPredict(HEDONIC_COMPARATIVE, x);

  const final = Number(prediction.toFixed(2));
  const rangeLow = Number((final * 0.88).toFixed(2));
  const rangeHigh = Number((final * 1.12).toFixed(2));

  let confidence = asset.confidence;
  if (asset.certificate_status !== 'complete') confidence -= 0.05;
  if (asset.features.condition_score < 4) confidence -= 0.08;
  if (input.freeRentDays > 90) confidence -= 0.05;
  confidence = Math.max(0.3, Math.min(0.98, confidence));

  return {
    model: 'comparative',
    final,
    rangeLow,
    rangeHigh,
    confidence,
    contributions: enrichContributions(contributions),
    factors: {
      base: HEDONIC_COMPARATIVE.base_score,
      region: x.subway_distance < 800 ? 1 : x.subway_distance < 1500 ? 0.97 : 0.92,
      physical: 1 + (x.condition_score - 5) * 0.02,
      equity: x.certificate_idx === 0 ? 1 : x.certificate_idx === 1 ? 0.95 : 0.85,
      deco: DECO_COEF[input.decoration],
      fr: Math.max(0.5, 1 + Math.floor(input.freeRentDays / 15) * -0.025),
    },
    modelLabel: '市场比较法 (Hedonic 回归)',
    uncertainty: 0.12,
    methodNote:
      `基于 Hedonic 对数线性回归（ln(rent) = β0 + Σ βi × xi），共 12 维特征。` +
      `训练数据：225 条资产 + 12 维特征；交叉验证 R² ≈ ${HEDONIC_COMPARATIVE.r2}。`,
  };
}

/* ========== 历史数据法：4 维 Hedonic 回归 ========== */
function hedonicHistoricalValuation(
  asset: Asset,
  _logic: ValuationLogic,
  input: ValuationInput
): ValuationResult {
  const x: HedonicHistoricalVector = {
    ...toHistoricalFeatureVector(asset),
    decoration_idx: { rough: 0, simple: 1, standard: 2, fine: 3 }[input.decoration],
    free_rent_idx: Math.floor(input.freeRentDays / 15),
  };

  const { prediction, contributions } = hedonicPredict(HEDONIC_HISTORICAL, x);
  const final = Number(prediction.toFixed(2));
  const rangeLow = Number((final * 0.85).toFixed(2));
  const rangeHigh = Number((final * 1.15).toFixed(2));

  let confidence = asset.confidence - 0.02;
  if (input.freeRentDays > 90) confidence -= 0.05;
  confidence = Math.max(0.3, Math.min(0.95, confidence));

  return {
    model: 'historical',
    final,
    rangeLow,
    rangeHigh,
    confidence,
    contributions: enrichContributions(contributions),
    factors: {
      base: prediction,
      region: 1,
      physical: 1,
      equity: 1,
      deco: DECO_COEF[input.decoration],
      fr: Math.max(0.5, 1 + Math.floor(input.freeRentDays / 15) * -0.02),
    },
    modelLabel: '历史数据法 (Hedonic 回归)',
    uncertainty: 0.16,
    methodNote:
      `基于历史成交均价 + 装修 + 免租期的 4 维 Hedonic 回归（ln(rent) = β0 + Σ βi × xi）。` +
      `交叉验证 R² ≈ ${HEDONIC_HISTORICAL.r2}，区间 ±16%，历史数据样本滞后。`,
  };
}

/**
 * 兼容入口：基于 Hedonic 模型计算 SHAP 贡献
 * 新代码请直接使用 hedonicPredict + HedonicModel
 */
export function shapFromHedonic(
  x: Record<string, number>,
  model: HedonicModel
): ShapContribution[] {
  const { contributions } = hedonicPredict(model, x);
  return enrichContributions(contributions);
}