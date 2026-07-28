/**
 * Hedonic 特征价格模型
 *
 * 模型形式：ln(rent_per_m²_per_day) = β0 + Σ βi × xi
 * 最终价格：rent = exp(β0 + Σ βi × xi)
 *
 * 贡献分解：每个特征的贡献 = βi × (xi - mean_i)
 *   - 正值 = 该特征优于市场均值，抬升价格
 *   - 负值 = 该特征劣于市场均值，压低价格
 *
 * 两套模型：
 *   - HEDONIC_COMPARATIVE（市场比较法）：12 维特征
 *   - HEDONIC_HISTORICAL（历史数据法）：4 维特征
 *
 * 训练数据：青岛商业办公出租样本 n=10（MVP 拟合，见 server/src/scripts/fit_hedonic.py）；
 * 比较法 R²≈0.85，历史法 R²≈0.14（历史法特征在出租数据上解释力弱，待扩充样本）
 */

// ============================================================
// 特征向量接口
// ============================================================

export interface HedonicFeatureVector {
  subway_distance: number;        // m
  condition_score: number;        // 1..10
  decoration_idx: number;         // 0..3 (rough/simple/standard/fine)
  certificate_idx: number;        // 0..2 (complete/pending/missing)
  is_cbd: number;                 // 0/1
  is_inner: number;               // 0/1 (核心商圈)
  log_area: number;               // log10(area) / 10
  school_score: number;           // 0..10
  commercial_density: number;     // 0..10
  deco_age: number;               // 2024 - last_renovation, 限定 0..30
  free_rent_idx: number;          // 0..12 (每 15 天一档)
  base_price_log: number;         // log10(estimated_price) / 2
  [k: string]: number;
}

export interface HedonicHistoricalVector {
  base_price_log: number;         // log10(estimated_price) / 2
  decoration_idx: number;
  deco_age: number;
  free_rent_idx: number;
  [k: string]: number;
}

export interface ShapRow {
  feature: string;
  contribution: number;
  source: string;
}

// ============================================================
// Hedonic 模型结构
// ============================================================

export interface HedonicModel {
  name: string;
  intercept: number;                          // β0
  coefficients: Record<string, number>;       // βi 系数
  feature_means: Record<string, number>;      // 各特征训练集均值
  feature_importance: Record<string, number>; // |βi × std_i| 标准化重要性
  base_score: number;                         // exp(β0 + Σ βi × mean_i) = 基准价
  r2: number;
}

// ============================================================
// 模型 1：市场比较法（12 维 hedonic 回归）
// ============================================================

export const HEDONIC_COMPARATIVE: HedonicModel = {
  name: 'Hedonic · 市场比较法',
  // 由青岛商业办公出租样本（n=10）经 ETL + 岭回归拟合（见 server/src/scripts/fit_hedonic.py）
  intercept: -6.1592,
  coefficients: {
    subway_distance:       0.000084,
    condition_score:       0.49865,
    decoration_idx:       -0.48560,
    certificate_idx:       0.00000,
    is_cbd:                0.32149,
    is_inner:              0.00000,
    log_area:              0.21869,
    school_score:          0.05305,
    commercial_density:    -0.11118,
    deco_age:              0.06369,
    free_rent_idx:         0.00000,
    base_price_log:        4.13799,
  },
  feature_means: {
    subway_distance: 2768.4,
    condition_score: 5.425,
    decoration_idx: 1.4,
    certificate_idx: 0.0,
    is_cbd: 0.8,
    is_inner: 0.0,
    log_area: 0.2632,
    school_score: 3.0,
    commercial_density: 5.1667,
    deco_age: 15.35,
    free_rent_idx: 2.0,
    base_price_log: 0.9220,
  },
  feature_importance: {
    condition_score: 0.2310,
    subway_distance: 0.1353,
    decoration_idx: 0.1812,
    commercial_density: 0.1188,
    school_score: 0.1134,
    deco_age: 0.0965,
    is_cbd: 0.0600,
    base_price_log: 0.0600,
    log_area: 0.0039,
    certificate_idx: 0.0,
    is_inner: 0.0,
    free_rent_idx: 0.0,
  },
  base_score: 2.2075,  // ≈ 青岛办公基准日租金 2.21 元/㎡·天
  r2: 0.8459,
};

// ============================================================
// 模型 2：历史数据法（4 维 hedonic 回归）
// ============================================================

export const HEDONIC_HISTORICAL: HedonicModel = {
  name: 'Hedonic · 历史数据法',
  // 由青岛商业办公出租样本（n=10）经 ETL + 岭回归拟合
  intercept: -2.9991,
  coefficients: {
    base_price_log:  3.88451,
    decoration_idx:  0.03997,
    deco_age:        0.00578,
    free_rent_idx:   0.00000,
  },
  feature_means: {
    base_price_log: 0.9220,
    decoration_idx: 1.4,
    deco_age: 15.35,
    free_rent_idx: 2.0,
  },
  feature_importance: {
    base_price_log: 0.7040,
    decoration_idx: 0.1865,
    deco_age: 0.1095,
    free_rent_idx: 0.0,
  },
  base_score: 2.0690,
  r2: 0.1424,
};

// ============================================================
// 中英文 feature 元信息（合规审计 + UI 渲染）
// ============================================================

export interface FeatureMeta {
  feature: string;
  feature_cn: string;
  category: '区位' | '物理' | '权益' | '装修' | '时间' | '价格' | '其他';
  unit: string;
  description: string;
}

export const FEATURE_META: Record<string, FeatureMeta> = {
  subway_distance: {
    feature: 'subway_distance',
    feature_cn: '距最近地铁站距离',
    category: '区位',
    unit: '米 (m)',
    description: '资产到最近地铁站出入口的实际步行距离。低于 800m 视为"地铁房"，可显著提升客群覆盖与议价权。系数 β=-0.0004，每远 1m 降 0.04%。',
  },
  condition_score: {
    feature: 'condition_score',
    feature_cn: '成新评分',
    category: '物理',
    unit: '1~10',
    description: '基于结构、外立面、装修、设备设施年度评估打分。10 分为全新落成，1 分为濒危。系数 β=0.09，每升 1 分涨 9%。',
  },
  decoration_idx: {
    feature: 'decoration_idx',
    feature_cn: '装修档位',
    category: '装修',
    unit: '0 毛坯 / 1 简装 / 2 标准 / 3 精装',
    description: '4 个装修档位，档位越高越好。系数 β=0.15，每升 1 档涨 15%。',
  },
  deco_age: {
    feature: 'deco_age',
    category: '时间',
    feature_cn: '装修年限',
    unit: '年',
    description: '距离上次装修/翻新的年数。超过 8 年视为折旧起点。系数 β=-0.04，每老 1 年降 4%。',
  },
  certificate_idx: {
    feature: 'certificate_idx',
    feature_cn: '权证完整度',
    category: '权益',
    unit: '0 齐全 / 1 待补 / 2 缺失',
    description: '不动产权证、消防许可等的状态。系数 β=-0.20，缺失状态直接打折 20%。',
  },
  school_score: {
    feature: 'school_score',
    feature_cn: '学区质量',
    category: '区位',
    unit: '0~10',
    description: '结合周边中小学评级生成的综合分。系数 β=0.04，每升 1 分涨 4%。',
  },
  commercial_density: {
    feature: 'commercial_density',
    feature_cn: '商业密度',
    category: '区位',
    unit: '0~10',
    description: '1km 内商业网点密度得分。系数 β=0.03，每升 1 分涨 3%。',
  },
  is_cbd: {
    feature: 'is_cbd',
    feature_cn: '是否核心 CBD 商圈',
    category: '区位',
    unit: '0/1',
    description: '资产是否位于东城/西城/黄浦/陆家嘴等核心 CBD 商圈。系数 β=0.30，CBD 溢价 30%。',
  },
  is_inner: {
    feature: 'is_inner',
    feature_cn: '是否内中环',
    category: '区位',
    unit: '0/1',
    description: '北京三环内/上海内中环视为内圈。系数 β=0.15，内环溢价 15%。',
  },
  free_rent_idx: {
    feature: 'free_rent_idx',
    feature_cn: '免租期档',
    category: '其他',
    unit: '每 15 天一档 (0=无, 12=180 天)',
    description: '洽谈阶段客户输入的免租期档位。系数 β=-0.025，每多一档降 2.5%。',
  },
  log_area: {
    feature: 'log_area',
    feature_cn: '面积规模',
    category: '其他',
    unit: 'log10(㎡) / 10',
    description: '建筑面积经对数标准化后的值。系数 β=-0.50，大面积有边际折扣。',
  },
  base_price_log: {
    feature: 'base_price_log',
    feature_cn: '基准价位（对数）',
    category: '价格',
    unit: 'log10(元/㎡·天) / 2',
    description: '历史成交均价的代理变量。系数 β=1.80（比较法）/ 1.90（历史法），是模型核心信号。',
  },
};

export function getFeatureMeta(name: string): FeatureMeta | undefined {
  return FEATURE_META[name];
}

// ============================================================
// Hedonic 推理：线性回归 + 贡献分解
// ============================================================

/**
 * Hedonic 模型推理
 *
 * ln(rent) = β0 + Σ βi × xi
 * rent = exp(β0 + Σ βi × xi)
 *
 * 每个特征的贡献 = βi × (xi - mean_i)
 *   正值 = 优于市场均值 → 抬升价格
 *   负值 = 劣于市场均值 → 压低价格
 */
export function hedonicPredict(
  model: HedonicModel,
  x: Record<string, number>,
): { prediction: number; contributions: ShapRow[] } {
  let logPrice = model.intercept;
  const contributions: ShapRow[] = [];

  for (const [feature, beta] of Object.entries(model.coefficients)) {
    const xi = x[feature] ?? 0;
    const mean = model.feature_means[feature] ?? 0;
    logPrice += beta * xi;

    // 贡献 = βi × (xi - mean_i)（对数空间贡献）
    const contribution = Number((beta * (xi - mean)).toFixed(4));
    contributions.push({
      feature,
      contribution,
      source: `β=${beta}, xi=${xi.toFixed(2)}, μ=${mean.toFixed(2)}, 贡献=β×(xi-μ)=${contribution}`,
    });
  }

  const prediction = Math.exp(logPrice);
  return { prediction: Number(prediction.toFixed(2)), contributions };
}

// ============================================================
// 特征工程：原始 Asset → feature vector
// ============================================================

export function toComparableFeatureVector(asset: {
  features: { subway_distance: number; condition_score: number };
  certificate_status: 'complete' | 'pending' | 'missing';
  decoration_level?: 'rough' | 'simple' | 'standard' | 'fine';
  last_renovation?: number;
  default_free_rent_days?: number;
  area: number;
  estimated_price: number;
  ai_features?: { location: { school_score: number; commercial_density: number } };
}): HedonicFeatureVector {
  const decoIdx = { rough: 0, simple: 1, standard: 2, fine: 3 };
  const certIdx = { complete: 0, pending: 1, missing: 2 } as const;

  return {
    subway_distance: asset.features.subway_distance,
    condition_score: asset.features.condition_score,
    decoration_idx: decoIdx[asset.decoration_level ?? 'standard'],
    certificate_idx: certIdx[asset.certificate_status],
    is_cbd: 0,
    is_inner: 0,
    log_area: Math.log10(asset.area) / 10,
    school_score: asset.ai_features?.location.school_score ?? 5,
    commercial_density: asset.ai_features?.location.commercial_density ?? 5,
    deco_age: Math.max(0, Math.min(30, 2024 - (asset.last_renovation ?? 2020))),
    free_rent_idx: Math.floor((asset.default_free_rent_days ?? 0) / 15),
    base_price_log: Math.log10(asset.estimated_price) / 2,
  };
}

export function toHistoricalFeatureVector(asset: {
  estimated_price: number;
  decoration_level?: 'rough' | 'simple' | 'standard' | 'fine';
  last_renovation?: number;
  default_free_rent_days?: number;
}): HedonicHistoricalVector {
  const decoIdx = { rough: 0, simple: 1, standard: 2, fine: 3 };
  return {
    base_price_log: Math.log10(asset.estimated_price) / 2,
    decoration_idx: decoIdx[asset.decoration_level ?? 'standard'],
    deco_age: Math.max(0, Math.min(30, 2024 - (asset.last_renovation ?? 2020))),
    free_rent_idx: Math.floor((asset.default_free_rent_days ?? 0) / 15),
  };
}
