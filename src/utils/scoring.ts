import type { Asset, RadarScores } from '@/types';

const clamp = (n: number, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, n));

/**
 * 计算单个资产的雷达四维评分（0~10）：
 *   交通：距地铁越近越高
 *   配套：成新分（近似）
 *   房龄：成新分（高分=新）
 *   价格：相对市场分位的反向（越便宜越高分）
 *
 * 该函数不依赖全市场数据，可在未加载全部资产时降级到只算前 3 项。
 */
export function calcRadarScores(asset: Asset, allAssets?: Asset[]): RadarScores {
  const 交通 = clamp(10 - asset.features.subway_distance / 1000);

  const 配套 = clamp(asset.features.condition_score);
  const 房龄 = clamp(asset.features.condition_score);

  let 价格 = 5; // 默认中性
  if (allAssets && allAssets.length > 1) {
    const prices = allAssets.map((a) => a.estimated_price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    if (max > min) {
      // 价格越低，得分越高
      const pct = (asset.estimated_price - min) / (max - min);
      价格 = clamp(10 * (1 - pct));
    }
  }

  return { 交通, 配套, 房龄, 价格 };
}

/** 市场均值雷达分数 */
export function marketAverageScores(assets: Asset[]): RadarScores {
  if (assets.length === 0) {
    return { 交通: 0, 配套: 0, 房龄: 0, 价格: 0 };
  }
  // 复用 calcRadarScores 计算每条资产，然后取均值
  const perAsset = assets.map((a) => calcRadarScores(a, assets));
  const len = perAsset.length;
  return {
    交通: Number((perAsset.reduce((s, x) => s + x.交通, 0) / len).toFixed(2)),
    配套: Number((perAsset.reduce((s, x) => s + x.配套, 0) / len).toFixed(2)),
    房龄: Number((perAsset.reduce((s, x) => s + x.房龄, 0) / len).toFixed(2)),
    价格: Number((perAsset.reduce((s, x) => s + x.价格, 0) / len).toFixed(2)),
  };
}
