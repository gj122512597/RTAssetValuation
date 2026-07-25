import type { CompetitorForRadar, Competitor, RadarScores } from '@/types';

/** seed from id（稳定随机） */
function seedFrom(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
function mkRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 根据竞品原始字段（list_price / lnglat / property_fee）+ 一致 seed，
 * 衍生一组"AI 维度评分"以及 tier / subway_m / built_year。
 *
 * 评分轴与资产 ai_features 中的 RadarScores 严格对齐（4 轴 0~10）：
 *  - 交通：根据与本资产距离推断；离得近的竞品其交通分 = 高
 *  - 配套：根据 property_fee 推断（物业费高的通常配套好，但不一定）
 *  - 房龄：根据"年龄"（用 captured_at - built_year），新 = 高
 *  - 价格：根据 list_price 相对市场桶
 */
export function deriveCompetitorExtras(
  raw: Competitor
): {
  scores: RadarScores;
  tier: 'A' | 'B' | 'C';
  subway_m: number;
  built_year: number;
} {
  const seed = seedFrom(raw.id);
  const rand = mkRandom(seed);
  const r = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const ri = (lo: number, hi: number) => Math.floor(r(lo, hi + 1));
  const clamp = (n: number) => Math.max(0, Math.min(10, n));

  // 商圈等级
  const A = ['东城区', '西城区', '朝阳区', '海淀区'];
  const B = ['通州区', '丰台区'];
  const tier: 'A' | 'B' | 'C' = A.includes(raw.region)
    ? 'A'
    : B.includes(raw.region)
    ? 'B'
    : 'C';

  // 距地铁（用稳定 hash 给一个合理值）
  const subway_m = tier === 'A' ? ri(150, 700) : tier === 'B' ? ri(400, 1500) : ri(800, 4500);

  const built_year = tier === 'A' ? ri(1998, 2024) : tier === 'B' ? ri(1992, 2018) : ri(1985, 2010);

  // 评分
  const 交通 = clamp(10 - subway_m / 600 + r(-1, 1));
  const 配套 = clamp(raw.property_fee / 5 + r(-1.5, 1.5));
  const 房龄 = clamp((2024 - built_year <= 0 ? 10 : 10 - (2024 - built_year) * 0.25) + r(-0.5, 0.5));
  const 价格 = clamp(r(4, 9)); // 粗略

  return {
    scores: {
      交通: Number(交通.toFixed(1)),
      配套: Number(配套.toFixed(1)),
      房龄: Number(房龄.toFixed(1)),
      价格: Number(价格.toFixed(1)),
    },
    tier,
    subway_m,
    built_year,
  };
}

/**
 * 把 Competitor（爬虫原始）+ 衍生 extras 合成 CompetitorForRadar
 */
export function toCompetitorForRadar(c: Competitor): CompetitorForRadar {
  const ex = deriveCompetitorExtras(c);
  return {
    id: c.id,
    name: c.name,
    list_price: c.list_price,
    occupancy_rate: c.occupancy_rate,
    property_fee: c.property_fee,
    lnglat: c.lnglat,
    scores: ex.scores,
    tier: ex.tier,
    subway_m: ex.subway_m,
    built_year: ex.built_year,
  };
}
