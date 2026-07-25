import type { Asset, NonStandardVerdict, SimilarCase } from '@/types';

/**
 * 非标判定（M4 P5-1 "极端非标" 触发器）
 *  - 空置 > 180 天
 *  - 成新 ≤ 3
 *  - 远郊（地铁距离 > 5000）
 *  - 季度收入 < 估值的 50%
 */
export function judgeNonStandard(asset: Asset): NonStandardVerdict {
  const triggers: string[] = [];
  let score = 0;
  if (asset.days_vacant > 180) {
    triggers.push(`空置 ${asset.days_vacant} 天，超过 180`);
    score += 0.3;
  } else if (asset.days_vacant > 90) {
    triggers.push(`空置 ${asset.days_vacant} 天，超过 90`);
    score += 0.1;
  }
  if (asset.features.condition_score <= 3) {
    triggers.push(`成新分 ${asset.features.condition_score}，极差`);
    score += 0.3;
  } else if (asset.features.condition_score < 5) {
    triggers.push(`成新分 ${asset.features.condition_score}，偏低`);
    score += 0.15;
  }
  if (asset.features.subway_distance > 5000) {
    triggers.push(`距地铁 ${asset.features.subway_distance}m，远郊`);
    score += 0.25;
  }
  if (asset.certificate_status === 'missing') {
    triggers.push('权证缺失');
    score += 0.15;
  }
  score = Math.min(1, score);
  return { isNonStandard: score >= 0.5, score, triggers };
}

/**
 * 相似度（M4 P5-1 "检索全国范围内最相似的已成交资产"）
 *  维度：业态 0.3 / 区域 0.15 / 面积对数差 0.2 / 成新差 0.2 / 单价桶近邻 0.15
 */
export function similarity(a: Asset, b: Asset): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  if (a.type === b.type) {
    s += 0.3;
    reasons.push('同业态');
  }
  if (a.region === b.region) {
    s += 0.15;
    reasons.push('同区域');
  }
  const areaDelta = Math.abs(Math.log10(a.area || 1) - Math.log10(b.area || 1));
  const areaSim = Math.max(0, 1 - areaDelta / 1.5);
  s += areaSim * 0.2;
  if (areaSim > 0.8) reasons.push('面积相近');

  const condDelta = Math.abs(a.features.condition_score - b.features.condition_score);
  const condSim = Math.max(0, 1 - condDelta / 10);
  s += condSim * 0.2;
  if (condSim > 0.8) reasons.push('成新相近');

  const bucketA = Math.floor(a.estimated_price);
  const bucketB = Math.floor(b.estimated_price);
  if (Math.abs(bucketA - bucketB) <= 1) {
    s += 0.15;
    reasons.push('同价位段');
  }

  return { score: Number(s.toFixed(2)), reasons };
}

/**
 * 给定一组候选资产，按相似度排序取前 N 个，并赋"残值 / 运输"系数
 *  - 残值默认根据 condition_score 推断
 *  - 运输默认按"远郊 1.2 / 偏远郊 1.0"
 */
export function pickSimilarCases(target: Asset, candidates: Asset[], topN = 4): SimilarCase[] {
  const list = candidates
    .filter((c) => c.id !== target.id)
    .map((c) => {
      const sim = similarity(target, c);
      const salvage = Math.max(0.4, Math.min(1.0, c.features.condition_score / 10));
      const transport = c.features.subway_distance > 5000 ? 1.2 : 1.0;
      return {
        asset: c,
        similarity: sim.score,
        salvage_coef: Number(salvage.toFixed(2)),
        transport_coef: transport,
        reasons: sim.reasons,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
  return list.slice(0, topN);
}

/**
 * 用相似案例 + 残值/运输系数给出"参考区间"
 *  - 取前 N 个相似案例的 estimated_price × (1 - 运输+残值折损)
 *  - 比例缩放到目标资产附近
 */
export function refRangeFromSimilarCases(target: Asset, cases: SimilarCase[]): {
  low: number;
  high: number;
  base: number;
  factors: { salvage: number; transport: number };
} {
  if (cases.length === 0) {
    return {
      low: Math.max(0.3, target.estimated_price * 0.5),
      high: target.estimated_price * 0.7,
      base: target.estimated_price * 0.6,
      factors: { salvage: 0.6, transport: 1.0 },
    };
  }
  const avgSalary = cases.reduce((s, c) => s + c.salvage_coef, 0) / cases.length;
  const avgTr = cases.reduce((s, c) => s + c.transport_coef, 0) / cases.length;
  const base =
    cases.reduce((s, c) => s + c.asset.estimated_price, 0) / cases.length;
  const adjusted = base * avgSalary * (2 - avgTr); // 运输越多折得越多
  return {
    low: Number((adjusted * 0.85).toFixed(2)),
    high: Number((adjusted * 1.15).toFixed(2)),
    base: Number(adjusted.toFixed(2)),
    factors: { salvage: Number(avgSalary.toFixed(2)), transport: Number(avgTr.toFixed(2)) },
  };
}
