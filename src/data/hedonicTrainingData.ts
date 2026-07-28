/**
 * Hedonic 模型训练数据（前端展示用）
 *
 * 数据来源：用户上传的《青岛商业办公_HedonicMVP_数据宽表.xlsx》中「办公用房出租」行的 10 条样本，
 * 经 server/src/scripts/fit_hedonic.py 的 ETL + 岭回归拟合（见 HedonicModelTrainingTab）。
 * 这 10 条即为当前线上模型（市场比较法 / 历史数据法）的唯一训练集。
 *
 * 字段说明：
 *  - 资产名称 / 挂牌编码 / 行政区 / 商圈等级 / 经度 / 纬度：来自 Excel 原表（无独立街道地址列，地址用「行政区」表示）
 *  - 建筑面积 / 真实月单位租金 / y_ln日租金：ETL 派生（真实月单位租金 = 整间月租金 ÷ 建筑面积；y = ln(日租金)）
 *  - 12 维特征：ETL 派生后的 HedonicFeatureVector
 */

export interface TrainingSample {
  序号: number;
  资产名称: string;
  挂牌编码: string;
  行政区: string;
  商圈等级: string;
  经度: number;
  纬度: number;
  建筑面积: number;
  真实月单位租金: number;
  y_ln日租金: number;
  subway_distance: number;
  condition_score: number;
  decoration_idx: number;
  certificate_idx: number;
  is_cbd: number;
  is_inner: number;
  log_area: number;
  school_score: number;
  commercial_density: number;
  deco_age: number;
  free_rent_idx: number;
  base_price_log: number;
}

/** 10 条训练样本（顺序与拟合脚本 load_samples() 一致） */
export const TRAINING_SAMPLES: TrainingSample[] = [
  { 序号: 1, 资产名称: '中海大厦', 挂牌编码: '35353536030', 行政区: '市北区', 商圈等级: '核心商圈', 经度: 120.3684036, 纬度: 36.0870737, 建筑面积: 500, 真实月单位租金: 85.20, y_ln日租金: 1.0438, subway_distance: 690, condition_score: 5.62, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.2699, school_score: 10, commercial_density: 8.33, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 2, 资产名称: '新澳国际', 挂牌编码: '686610825961', 行政区: '李沧区', 商圈等级: '次核心商圈', 经度: 120.4277878, 纬度: 36.1606941, 建筑面积: 860, 真实月单位租金: 57.80, y_ln日租金: 0.6558, subway_distance: 9326, condition_score: 4.62, decoration_idx: 1, certificate_idx: 0, is_cbd: 0, is_inner: 0, log_area: 0.2934, school_score: 0, commercial_density: 3.33, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.8598 },
  { 序号: 3, 资产名称: '万邦中心', 挂牌编码: '595638952867', 行政区: '市南区', 商圈等级: '核心商圈', 经度: 120.3690650, 纬度: 36.0605333, 建筑面积: 2087, 真实月单位租金: 59.99, y_ln日租金: 0.6930, subway_distance: 1397, condition_score: 4.62, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.3320, school_score: 0, commercial_density: 3.33, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 4, 资产名称: '卓越·世纪中心', 挂牌编码: '82362159814', 行政区: '市北区', 商圈等级: '核心商圈', 经度: 120.3768930, 纬度: 36.0879018, 建筑面积: 500, 真实月单位租金: 75.00, y_ln日租金: 0.9163, subway_distance: 81, condition_score: 5.62, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.2699, school_score: 10, commercial_density: 8.33, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 5, 资产名称: '金孚大厦', 挂牌编码: '300638032261', 行政区: '市南区', 商圈等级: '核心商圈', 经度: 120.3709793, 纬度: 36.0770950, 建筑面积: 179, 真实月单位租金: 42.00, y_ln日租金: 0.3365, subway_distance: 1294, condition_score: 5.07, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.2253, school_score: 0, commercial_density: 3.33, deco_age: 10.0, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 6, 资产名称: 'SIIC上实中心', 挂牌编码: '490551162936', 行政区: '崂山区', 商圈等级: '核心商圈', 经度: 120.4603102, 纬度: 36.0968151, 建筑面积: 210, 真实月单位租金: 90.00, y_ln日租金: 1.0986, subway_distance: 4467, condition_score: 7.08, decoration_idx: 3, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.2322, school_score: 10, commercial_density: 8.33, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 7, 资产名称: '华普大厦', 挂牌编码: '310365418095', 行政区: '市南区', 商圈等级: '核心商圈', 经度: 120.3898107, 纬度: 36.0646724, 建筑面积: 150, 真实月单位租金: 55.55, y_ln日租金: 0.6161, subway_distance: 528, condition_score: 3.77, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.2176, school_score: 0, commercial_density: 3.33, deco_age: 23.0, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 8, 资产名称: '华仁国际大厦', 挂牌编码: '976582742612', 行政区: '市南区', 商圈等级: '核心商圈', 经度: 120.3764371, 纬度: 36.0624070, 建筑面积: 230, 真实月单位租金: 106.89, y_ln日租金: 1.2706, subway_distance: 702, condition_score: 5.62, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.2362, school_score: 0, commercial_density: 3.33, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.9375 },
  { 序号: 9, 资产名称: '银盛泰国际商务港', 挂牌编码: '23316335485', 行政区: '城阳区', 商圈等级: '次核心商圈', 经度: 120.3939285, 纬度: 36.3044014, 建筑面积: 240, 真实月单位租金: 47.08, y_ln日租金: 0.4507, subway_distance: 9114, condition_score: 7.08, decoration_idx: 3, certificate_idx: 0, is_cbd: 0, is_inner: 0, log_area: 0.2380, school_score: 0, commercial_density: 6.67, deco_age: 14.5, free_rent_idx: 2, base_price_log: 0.8598 },
  { 序号: 10, 资产名称: '世纪大厦', 挂牌编码: 'QD00639026', 行政区: '市南区', 商圈等级: '核心商圈', 经度: 120.3842029, 纬度: 36.0632535, 建筑面积: 1500, 真实月单位租金: 75.00, y_ln日租金: 0.9163, subway_distance: 85, condition_score: 5.17, decoration_idx: 1, certificate_idx: 0, is_cbd: 1, is_inner: 0, log_area: 0.3176, school_score: 0, commercial_density: 3.33, deco_age: 19.0, free_rent_idx: 2, base_price_log: 0.9375 },
];

export interface FeatureMeta {
  /** 模型内部特征名（与 coefficients 的 key 一致） */
  key: string;
  /** 中文名 */
  cn: string;
  /** 含义 / 取值说明 */
  desc: string;
  /** 是否在青岛宽表中无来源、填常量（系数=0，对模型无贡献） */
  constant?: boolean;
}

/** 12 维 Hedonic 特征的中文元数据（用于系数表与训练数据表头） */
export const FEATURE_META: FeatureMeta[] = [
  { key: 'subway_distance', cn: '到地铁站距离', desc: '单位：米（越近越好）' },
  { key: 'condition_score', cn: '楼宇条件评分', desc: '1–10，由楼宇等级+装修+房龄合成' },
  { key: 'decoration_idx', cn: '装修评分', desc: '0–3' },
  { key: 'certificate_idx', cn: '产权证书指数', desc: 'Excel 无来源 → 恒填 0（系数=0）', constant: true },
  { key: 'is_cbd', cn: '是否核心商圈', desc: '1=核心商圈，0=次核心商圈' },
  { key: 'is_inner', cn: '是否内环', desc: '青岛无内中环口径 → 恒填 0（系数=0）', constant: true },
  { key: 'log_area', cn: '建筑面积对数', desc: '= log10(面积) / 10' },
  { key: 'school_score', cn: '学区评分', desc: '重点小学学区=10，否则=0' },
  { key: 'commercial_density', cn: '商业密度', desc: '0–10，由到商场距离反推（10 − 到商场距离/300）' },
  { key: 'deco_age', cn: '房龄', desc: '单位：年' },
  { key: 'free_rent_idx', cn: '免租期指数', desc: 'Excel 无来源 → 恒填 2（系数=0）', constant: true },
  { key: 'base_price_log', cn: '基准价对数代理', desc: '= log10(同商圈中位月单位租金) / 2' },
];

/** 特征 key → 中文名 的速查表 */
export const FEATURE_CN: Record<string, string> = FEATURE_META.reduce(
  (acc, f) => ((acc[f.key] = f.cn), acc),
  {} as Record<string, string>,
);

/** 市场比较法使用的特征顺序 */
export const COMPARATIVE_FEATS = FEATURE_META.map((f) => f.key);
/** 历史数据法使用的 4 维特征 */
export const HISTORICAL_FEATS = ['base_price_log', 'decoration_idx', 'deco_age', 'free_rent_idx'];
