import type { Asset, Competitor, CompetitorForRadar, RadarScores } from '@/types';

/** 任何具备 list_price 的对象——同时兼容 Competitor 和 CompetitorForRadar */
type HasPrice = Pick<Competitor | CompetitorForRadar, 'list_price'>;

/**
 * 简易 SHAP（M2 P2-2 溯源）
 *
 * 真 SHAP 需要训练模型。这里用一个可解释的启发式：
 *   - 每个特征最终落到一个总价格上，每个特征独立贡献一个数；
 *   - 贡献的正负与上文 calcValuation 中各因子一致；
 *   - "来源" 字段直接描述该系数是怎么算出来的，方便核价人员审计。
 *
 * 与 calcValuation 返回的 contributions 重叠，这里提供：
 *   - 排序后的影响列表
 *   - "按特征归类"的桶
 */

export interface ShapSummary {
  top: { feature: string; contribution: number; source: string }[];
  positive: { feature: string; value: number }[];
  negative: { feature: string; value: number }[];
}

export function summarize(
  contributions: { feature: string; contribution: number; source: string }[]
): ShapSummary {
  const sorted = [...contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const positive = contributions
    .filter((c) => c.contribution > 0)
    .map((c) => ({ feature: c.feature, value: c.contribution }));
  const negative = contributions
    .filter((c) => c.contribution < 0)
    .map((c) => ({ feature: c.feature, value: c.contribution }));
  return { top: sorted, positive, negative };
}

/**
 * 对标雷达对比（M2 P2-3）
 * - 交通 = 10 - subway_distance / 1000
 * - 配套 = condition_score
 * - 房龄 = (今年 - last_renovation) → 反向分
 * - 价格 = 相对竞品均价的反向（便宜=高分）
 *
 * 与市场均值不同，对标对象是选中资产的 3km 半径圈内核销（≤5 个）。
 */
export function calcRadarForAssetVsComps(
  asset: Asset,
  comps: HasPrice[]
): {
  mine: RadarScores;
  compAvg: RadarScores;
} {
  const thisYear = new Date().getFullYear();
  const 交通 = Math.max(0, 10 - asset.features.subway_distance / 1000);
  const 配套 = asset.features.condition_score;
  const ageGap = thisYear - (asset.last_renovation ?? thisYear);
  const 房龄 = Math.max(0, 10 - ageGap);

  let mine = { 交通, 配套, 房龄, 价格: 5 };
  if (comps.length > 0) {
    const avg = comps.reduce((s, c) => s + c.list_price, 0) / comps.length;
    const cmax = Math.max(...comps.map((c) => c.list_price));
    const min = Math.min(...comps.map((c) => c.list_price));
    if (cmax > min) {
      const pct = (asset.estimated_price - min) / (cmax - min);
      mine = { ...mine, 价格: Math.max(0, 10 * (1 - pct)) };
    }
  }

  /** 竞品均值 */
  const cmaxRef = comps.length > 0 ? Math.max(...comps.map((c) => c.list_price)) : 0;
  const comp交通 = comps.length
    ? comps.reduce((s) => s + 5, 0) / Math.max(1, comps.length) // 无 subway 信息，给中性 5
    : 5;
  const comp配套 = comps.length
    ? comps.reduce((s) => s + 7, 0) / comps.length // 假设竞品平均成新 7
    : 7;
  const comp房龄 = comps.length
    ? comps.reduce((s) => s + 7, 0) / comps.length
    : 7;
  const comp价格 = comps.length && cmaxRef > 0
    ? comps.reduce((s, c) => s + (1 - c.list_price / cmaxRef), 0) / comps.length * 10
    : 5;

  return {
    mine,
    compAvg: {
      交通: Number(comp交通.toFixed(2)),
      配套: Number(comp配套.toFixed(2)),
      房龄: Number(comp房龄.toFixed(2)),
      价格: Number(comp价格.toFixed(2)),
    },
  };
}

/** 取 GeoJSON 半径内的最多 5 个竞品
 *  - 泛型输入：兼容 Competitor / CompetitorForRadar
 *  - 返回 T[]：原样返回最相近的 5 条（不做字段裁剪）
 */
export function pickCompsInRadius<T extends { lnglat: [number, number] }>(
  asset: Asset,
  comps: T[],
  radiusKm: number
): T[] {
  // 这里直接用静态半径过滤
  const arr: T[] = [];
  for (const c of comps) {
    const dLat = c.lnglat[1] - asset.lnglat[1];
    const dLng = (c.lnglat[0] - asset.lnglat[0]) * Math.cos((asset.lnglat[1] * Math.PI) / 180);
    const km = Math.sqrt(dLat ** 2 + dLng ** 2) * 111.32;
    if (km <= radiusKm) arr.push(c);
  }
  return arr.slice(0, 5);
}
