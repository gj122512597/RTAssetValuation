export type AssetStatus = 'vacant' | 'leased' | 'renovating';

export type BusinessType =
  | 'office'
  | 'retail'
  | 'hotel'
  | 'apartment'
  | 'warehouse'
  | 'plant';

export type CertificateStatus = 'complete' | 'pending' | 'missing';
export type ReceivedBatch = 'batch-1' | 'batch-2' | 'batch-3' | 'batch-4';
export type DecorationLevel = 'rough' | 'simple' | 'standard' | 'fine';

export type HiddenRiskTag =
  | 'special_license'
  | 'clear_eviction'
  | 'military_legacy'
  | 'covenant_limit'
  | 'fire_safety'
  | 'tax_issue'
  | 'mortgage';

/**
 * AI 建模所需的扩展特征（PRD §3 数据需求 + §4 特征工程）
 * 按数据来源分组 10 组，UI 端按组展开。
 */

/**
 * 历史成交记录（PRD §3 内部 ERP 交易数据）
 * - 每条资产有时间序列的交易历史
 * - 用于：
 *   - 客户经理谈价：展示该资产历年价格走势
 *   - 价格趋势预测：XGBoost 时间序列扩展的输入
 *   - 投资回报测算：过去 N 年实际成交 + 未来预测
 */
export interface Transaction {
  /** 交易 ID */
  id: string;
  /** 成交日期（YYYY-MM-DD） */
  date: string;
  /** 成交价（元/㎡·天） */
  price_per_m2: number;
  /** 租客/客户公司（mock 真实公司名） */
  tenant: string;
  /** 业态（与资产 type 可能不同——资产可能换业态） */
  type: BusinessType | string;
  /** 租期（月） */
  lease_term_months: number;
  /** 免租期（天） */
  free_rent_days: number;
  /** 押金月数（押几付几） */
  deposit_months: number;
  /** 年递增率（%） */
  annual_increment_pct: number;
  /** 续约情况：new（首次签约）/ renewal（续约）/ handover（接手） */
  status: 'new' | 'renewal' | 'handover';
  /** 履约完成情况：良好 / 提前退租 / 逾期 */
  performance: 'good' | 'early_exit' | 'overdue';
  /** 备注：mock 中可能是"部队内部周转"、"中标"等 */
  notes?: string;
}

export interface AssetAiFeatures {
  /** 1. 基础属性（内部 ERP） */
  basic: {
    completion_year: number;
    building_structure: 'frame' | 'brick' | 'mixed';
    above_ground_floors: number;
    parking_spaces: number;
    elevator_count: number;
    land_area_sqm?: number;
  };
  /** 2. 区位特征（GIS + 地址 NLP） */
  location: {
    distance_to_cbd_km: number;
    distance_to_airport_km: number;
    school_score: number;
    hospital_score: number;
    commercial_density: number;
    business_district_tier: 'A' | 'B' | 'C';
    surrounding_tower_count: number;
    population_density_pkm2: number;
  };
  /** 3. 物理状态评分（图像识别 + 描述 NLP） */
  physical: {
    facade_score: number;
    structure_score: number;
    lighting_score: number;
    ventilation_score: number;
    noise_db: number;
    sunlight_hours: number;
    nlp_keywords: string[];
    nlp_highlights: string[];
    nlp_risks: string[];
  };
  /** 4. 历史交易（内部 ERP） */
  trade: {
    trade_count: number;
    last_trade_date: string | null;
    last_trade_per_m2: number | null;
    total_volume_yuan: number;
    avg_free_rent_days: number;
    overdue_count: number;
    contract_completion_rate: number;
    average_deposit_months: number;
  };
  /** 5. OCR 评估公司报告 */
  ocr: {
    last_valuation_company: string;
    last_valuation_date: string;
    last_valuation_per_m2: number;
    pdf_url: string;
    confidence: number;
  };
  /** 6. 竞品挂牌（爬虫：贝壳/58/房天下） */
  competitor: {
    listings_3km: number;
    avg_listing_price: number;
    lowest_listing_price: number;
    highest_listing_price: number;
    avg_negotiation_strength: number;
    last_crawl_at: string;
  };
  /** 7. 流拍记录 */
  auction: {
    failed_count: number;
    last_failed_date: string | null;
    lowest_call_price_ratio: number;
  };
  /** 8. 人工调研数据 */
  survey: {
    investigator: string;
    survey_date: string;
    site_photos_count: number;
    defects: string[];
    manual_adjustment_coef: number;
    adjustment_reason: string;
  };
  /** 9. POI 1km 内统计 */
  poi: {
    metro_stations: number;
    bus_stops: number;
    schools: number;
    hospitals: number;
    shopping_malls: number;
    parks: number;
  };
  /** 10. 各数据源最近同步时间戳 */
  data_sources: {
    erp_synced_at: string;
    external_crawled_at: string;
    ocr_extracted_at: string;
    survey_at: string;
    nlp_at: string;
    poi_metadata_version: string;
  };
}

export interface Asset {
  id: string;
  name: string;
  address?: string;
  lnglat: [number, number];
  area: number;
  status: AssetStatus;
  days_vacant: number;
  type: BusinessType | string;
  estimated_price: number;
  monthly_rent?: number;
  occupancy_rate?: number;
  confidence: number;
  region: string;
  received_batch: ReceivedBatch;
  certificate_status: CertificateStatus;
  decoration_level?: DecorationLevel;
  last_renovation?: number;
  default_free_rent_days?: number;
  images?: string[];
  hidden_risks?: HiddenRiskTag[];
  features: {
    subway_distance: number;
    condition_score: number;
  };
  /**
   * AI 建模所需的扩展特征（PRD §3 数据需求 + §4 特征工程）
   * 为可选字段，向后兼容存量资产 mock。
   * 缺失时表示该资产尚未补齐特征工程。
   */
  ai_features?: AssetAiFeatures;
  /**
   * 历史成交租金时间序列
   * - 按时间从早到晚排序（最早在最前）
   * - 至少包含最近 3-6 年的交易
   * - leased 状态资产有更完整的交易链；vacant 资产少
   */
  historical_transactions?: Transaction[];
}

export interface Competitor {
  id: string;
  name: string;
  lnglat: [number, number];
  region: string;
  type: BusinessType | string;
  list_price: number;
  property_fee: number;
  occupancy_rate: number;
  source: 'beike' | '58' | 'fangtianxia' | 'lianjia';
  captured_at: string;
  layout?: string;
}

/** 融通地产评估系统当前支持的两种定价方法 */
export type PricingModel = 'comparative' | 'historical';

export interface ValuationLogic {
  base_price: number;
  coefficients: {
    subway: { weight: number; desc: string };
    condition: { weight: number; desc: string };
  };
  type_base: Record<string, number>;
  decoration_coef: Record<DecorationLevel, number>;
  free_rent_per_15d: number;
  default_model: PricingModel;
}

export interface ShapContribution {
  feature: string;       // 英文特征名（XGBoost 标准）
  contribution: number;
  source: string;        // 详细取值来源说明（技术型）
  /** 中文业务名 + 中文解释（合规审计用） */
  feature_cn?: string;
  explanation?: string;
}

export interface RadarScores {
  交通: number;
  配套: number;
  房龄: number;
  价格: number;
}

export interface CompetitorForRadar {
  id: string;
  name: string;
  list_price: number;
  occupancy_rate: number;
  property_fee: number;
  lnglat: [number, number];
  /** 4 维评分（与 AI 建模一致：交通/配套/房龄/价格） */
  scores?: RadarScores;
  /** 商圈等级 A/B/C */
  tier?: 'A' | 'B' | 'C';
  /** 距地铁距离 m */
  subway_m?: number;
  /** 建成年份 */
  built_year?: number;
}

/** 当前固定使用高德 AMap 引擎（保留类型占位以备未来扩展） */
export type MapEngineType = 'amap';
export type RegionLayerMode = 'none' | 'cluster' | 'district';
export interface CurrentUser {
  name: string;
  scope: 'region' | 'global';
  region?: string;
}

/* ===== M3: 报告 / 爬虫 ===== */

/** 报告章节类型 */
export type ReportSection =
  | 'cover'
  | 'summary'
  | 'assetProfile'
  | 'valuation'
  | 'shap'
  | 'competition'
  | 'risk'
  | 'compliance'
  | 'appendix';

/** 单项合规检查 */
export interface ComplianceCheckItem {
  key: string;
  label: string;
  passed: boolean;
  weight: number;       // 0~10
  detail: string;
}

/** 合规审查总分 */
export interface ComplianceResult {
  score: number;        // 0~100
  level: 'excellent' | 'good' | 'risk' | 'unqualified';
  items: ComplianceCheckItem[];
  /** 报告中实际用了哪些方法（"双方法交叉验证"原则，至少 1 种） */
  modelsUsed: PricingModel[];
}

/** 爬虫任务 mock */
export interface CrawlerTask {
  id: string;
  source: 'beike' | '58' | 'fangtianxia' | 'lianjia';
  region: string;
  schedule: string;        // cron-like
  last_run_at: string;
  record_count: number;
  status: 'running' | 'paused' | 'error';
  /** 校准数量（人工修过的） */
  manual_calibrated: number;
}

/** 报告输出 */
export interface GeneratedReport {
  assetId: string;
  generatedAt: string;
  model: PricingModel;
  sections: ReportSection[];
}

/* ===== M4: POI / 相似案例 ===== */

/** 地铁线 mock */
export interface MetroLine {
  id: string;
  name: string;        // "1号线"
  color: string;       // "#e63832"
  coordinates: [number, number][];
}

/** 商圈 */
export interface BusinessDistrict {
  id: string;
  name: string;       // "国贸 CBD"
  level: 'A' | 'B' | 'C';
  center: [number, number];
  radius_km: number;
}

/** 人口热力点 */
export interface PopulationHot {
  id: string;
  center: [number, number];
  intensity: number;   // 0~1
}

/** 综合 POI 数据集 */
export interface PoiDataset {
  metro: MetroLine[];
  districts: BusinessDistrict[];
  hot: PopulationHot[];
}

/** 相似案例（M4 P5-1） */
export interface SimilarCase {
  asset: Asset;
  similarity: number;        // 0~1
  /** 残值系数（人工可调） */
  salvage_coef: number;      // 0.5 ~ 1.0
  /** 运输成本系数（人工可调） */
  transport_coef: number;    // 1.0 ~ 1.3
  /** 推荐的相似度理由 */
  reasons: string[];
}

/** 非标判定（M4） */
export interface NonStandardVerdict {
  isNonStandard: boolean;
  /** 0~1，越大越非标 */
  score: number;
  triggers: string[];
}
