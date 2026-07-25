import type { Asset, AssetAiFeatures } from '@/types';

/** 用资产 ID 做稳定 hash，让同一资产始终生成同一份 mock 特征 */
function seedFrom(asset: Asset): number {
  let h = 0;
  for (const ch of asset.id + asset.name) {
    h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return h;
}

/** 简易 seeded random（mulberry32） */
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

const INVESTIGATORS = ['王明', '张磊', '陈思敏', '李楠', '赵玮', '周航'];
const VALUATION_COMPANIES = ['中瑞世联', '国策评估', '世联行', '戴德梁行', '第一太平戴维斯', '中原地产'];
const STRUCTURES: AssetAiFeatures['basic']['building_structure'][] = ['frame', 'brick', 'mixed'];

const HIGHLIGHTS_BY_TYPE: Record<string, string[]> = {
  office: ['CBD 核心', '甲级写字楼', '5A 智能化', '近地铁'],
  retail: ['临街展示面', '客流密集', '餐饮禁入不限', '商业氛围浓'],
  hotel: ['连锁品牌入驻', '商旅需求', '精装客房', '电梯独立'],
  apartment: ['白领聚集', '通勤便利', '周边配套齐全', '精装出租'],
  plant: ['独立院落', '路网成熟', '电力充沛', '厂房规范化'],
  warehouse: ['高货架', '电梯月台', '园区物业', '24h 安保'],
};

const RISK_KEYWORDS_POOL = ['产权瑕疵', '强电整改', '电梯老化', '消防升级', '噪音扰民', '管线老化', '渗水维修'];

/**
 * 按 PRD §3/§4 程序化生成 10 组 AI 建模特征
 *
 * 原则：每条资产的特征由"已知字段 (region/area/condition/type/...)" 派生，
 * 同时用 id 衍生稳定随机 seed 保证同一资产每次得到的值完全一致，
 * 便于跨会话核对、调试。
 */
export function generateAiFeatures(asset: Asset): AssetAiFeatures {
  const seed = seedFrom(asset);
  const rand = mkRandom(seed);
  const r = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const ri = (lo: number, hi: number) => Math.floor(r(lo, hi + 1));
  const pick = <T>(arr: T[]): T => arr[ri(0, arr.length - 1)];

  // ===== 1. 基础属性 =====
  const isNewBuilding = (asset.last_renovation ?? 2010) > 2020;
  const structure = pick(STRUCTURES);
  const above_ground_floors =
    asset.area > 15000 ? ri(4, 9) : asset.area > 5000 ? ri(6, 18) : ri(2, 6);
  const parking_spaces = Math.floor(asset.area / 80); // ~80㎡/车位
  const elevator_count =
    above_ground_floors >= 10 ? ri(3, 6) : above_ground_floors >= 5 ? ri(2, 3) : ri(0, 1);

  const basic: AssetAiFeatures['basic'] = {
    completion_year: asset.last_renovation ?? ri(1998, 2018),
    building_structure: structure,
    above_ground_floors,
    parking_spaces,
    elevator_count,
    land_area_sqm: Math.floor(asset.area * r(0.8, 1.2)),
  };

  // ===== 2. 区位特征（按 region 判定 CBD / 商圈等级） =====
  const CBD_REGIONS = ['东城区', '西城区'];
  const INNER_RING = ['朝阳区', '海淀区', '丰台区'];
  const isCBD = CBD_REGIONS.includes(asset.region);
  const isInner = INNER_RING.includes(asset.region);

  const distance_to_cbd_km = isCBD ? r(0.5, 3) : isInner ? r(3, 8) : r(10, 28);
  const distance_to_airport_km = isCBD
    ? r(22, 28)
    : isInner
    ? r(25, 35)
    : r(30, 65);

  // 评分：根据 feature 已有数据 + region 推断
  const regionSchool: Record<string, number> = {
    东城区: 9.5,
    西城区: 9.4,
    海淀区: 9.2,
    朝阳区: 7.8,
    丰台区: 6.5,
    通州区: 6.0,
    昌平区: 5.4,
    大兴区: 5.0,
    顺义区: 4.6,
    房山区: 3.5,
  };
  const school_score = Number(((regionSchool[asset.region] ?? 5) + r(-0.4, 0.4)).toFixed(1));
  const hospital_score = Number((Math.min(10, school_score + r(-1, 1))).toFixed(1));
  const commercial_density = Number(
    Math.min(10, Math.max(0, asset.features.subway_distance < 1000 ? r(7, 10) : r(3, 7))).toFixed(1)
  );

  // 商圈等级：A (CBD/中关村 朝阳 CBD 海淀中关村) / B (通州/望京) / C (其他)
  const TIERS_A = ['东城区', '西城区', '朝阳区', '海淀区'];
  const TIERS_B = ['通州区', '丰台区'];
  const business_district_tier: AssetAiFeatures['location']['business_district_tier'] = TIERS_A.includes(
    asset.region
  )
    ? 'A'
    : TIERS_B.includes(asset.region)
    ? 'B'
    : 'C';

  const surrounding_tower_count = ri(
    business_district_tier === 'A' ? 12 : business_district_tier === 'B' ? 4 : 1,
    business_district_tier === 'A' ? 35 : business_district_tier === 'B' ? 12 : 4
  );
  const population_density_pkm2 = ri(
    business_district_tier === 'A' ? 15000 : business_district_tier === 'B' ? 5000 : 800,
    business_district_tier === 'A' ? 30000 : business_district_tier === 'B' ? 18000 : 6000
  );

  const location: AssetAiFeatures['location'] = {
    distance_to_cbd_km: Number(distance_to_cbd_km.toFixed(1)),
    distance_to_airport_km: Number(distance_to_airport_km.toFixed(1)),
    school_score,
    hospital_score,
    commercial_density,
    business_district_tier,
    surrounding_tower_count,
    population_density_pkm2,
  };

  // ===== 3. 物理状态评分 =====
  const cond = asset.features.condition_score;
  const facade_score = Number(Math.min(10, Math.max(0, cond + r(-0.7, 0.7))).toFixed(1));
  const structure_score = Number(Math.min(10, Math.max(0, cond + r(-1, 1))).toFixed(1));
  const lighting_score = Number(Math.min(10, Math.max(0, cond * 0.9 + r(-0.5, 1))).toFixed(1));
  const ventilation_score = Number(Math.min(10, Math.max(0, cond * 0.95 + r(-0.4, 0.8))).toFixed(1));
  // 噪音：地铁近 = 大，临街 = 较大
  const noise_db = Math.floor(
    Math.min(80, Math.max(35, 40 + (asset.features.subway_distance < 500 ? 12 : 0) + r(0, 15)))
  );
  const sunlight_hours = Number(
    Math.min(8, Math.max(2, (cond / 10) * 5 + r(0.5, 1.8))).toFixed(1)
  );

  const baseKeywords = HIGHLIGHTS_BY_TYPE[asset.type] ?? ['交通便利', '方正户型'];
  const nlp_keywords = [
    ...baseKeywords.slice(0, 3),
    `距地铁 ${asset.features.subway_distance}m`,
    `成新分 ${cond}/10`,
  ];
  const nlp_highlights = baseKeywords.slice(0, 3);

  // 风险关键词：基于 hidden_risks + 物理状态
  const nlp_risks: string[] = [];
  if (cond < 4) nlp_risks.push('成新差');
  if (noise_db > 65) nlp_risks.push('噪音偏大');
  if (asset.features.subway_distance > 5000) nlp_risks.push('远郊');
  if (asset.certificate_status === 'missing') nlp_risks.push('权证缺失');
  if (asset.hidden_risks?.includes('fire_safety')) nlp_risks.push('消防不达标');
  if (nlp_risks.length === 0) nlp_risks.push(pick(RISK_KEYWORDS_POOL));

  const physical: AssetAiFeatures['physical'] = {
    facade_score,
    structure_score,
    lighting_score,
    ventilation_score,
    noise_db,
    sunlight_hours,
    nlp_keywords,
    nlp_highlights,
    nlp_risks,
  };

  // ===== 4. 历史交易 =====
  const trade_count =
    asset.status === 'leased' ? ri(2, 6) : asset.status === 'vacant' ? ri(0, 3) : 0;
  const last_trade_date =
    trade_count === 0
      ? null
      : `20${23 - (trade_count > 4 ? 0 : 1)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`;
  const last_trade_per_m2 =
    trade_count === 0 ? null : Number((asset.estimated_price * r(0.85, 1.15)).toFixed(2));
  const total_volume_yuan = trade_count > 0 ? Math.floor(asset.estimated_price * asset.area * 365 * trade_count * r(0.5, 1.0)) : 0;
  const overdue_count = ri(0, trade_count > 1 ? 2 : 0);
  const contract_completion_rate = Number(
    Math.max(0.6, Math.min(1, 1 - overdue_count * 0.07 + r(-0.05, 0.05))).toFixed(2)
  );

  const trade: AssetAiFeatures['trade'] = {
    trade_count,
    last_trade_date,
    last_trade_per_m2,
    total_volume_yuan,
    avg_free_rent_days: asset.default_free_rent_days ?? 30,
    overdue_count,
    contract_completion_rate,
    average_deposit_months: ri(1, 3),
  };

  // ===== 5. OCR 评估报告 =====
  const ocr: AssetAiFeatures['ocr'] = {
    last_valuation_company: pick(VALUATION_COMPANIES),
    last_valuation_date: `2024-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`,
    last_valuation_per_m2: Number((asset.estimated_price * r(0.92, 1.05)).toFixed(2)),
    pdf_url: `https://valuation.rtasset.internal/${asset.id}.pdf`,
    confidence: Number(Math.min(0.99, Math.max(0.7, cond / 10 + r(-0.05, 0.08))).toFixed(2)),
  };

  // ===== 6. 竞品挂牌（爬虫） =====
  const competitor: AssetAiFeatures['competitor'] = {
    listings_3km: ri(business_district_tier === 'A' ? 12 : business_district_tier === 'B' ? 4 : 1, business_district_tier === 'A' ? 35 : business_district_tier === 'B' ? 15 : 6),
    avg_listing_price: Number((asset.estimated_price * r(0.85, 1.25)).toFixed(2)),
    lowest_listing_price: Number((asset.estimated_price * r(0.6, 0.85)).toFixed(2)),
    highest_listing_price: Number((asset.estimated_price * r(1.2, 1.6)).toFixed(2)),
    avg_negotiation_strength: Number(Math.min(0.4, Math.max(0.05, r(0.05, 0.3))).toFixed(2)),
    last_crawl_at: '2026-07-23',
  };

  // ===== 7. 流拍记录 =====
  const failed_count = asset.certificate_status === 'missing' ? ri(1, 3) : ri(0, 1);
  const auction: AssetAiFeatures['auction'] = {
    failed_count,
    last_failed_date: failed_count > 0 ? '20' + String(20 + ri(0, 4)) + '-' + String(ri(1, 12)).padStart(2, '0') + '-01' : null,
    lowest_call_price_ratio: failed_count > 0 ? Number(r(0.6, 0.85).toFixed(2)) : 0,
  };

  // ===== 8. 人工调研 =====
  const defects: string[] = [];
  if (cond < 4) defects.push('外墙局部脱落');
  if (noise_db > 68) defects.push('临街噪声明显');
  if (elevator_count === 0 && above_ground_floors > 3) defects.push('无电梯');
  if (above_ground_floors > 6 && cond < 6) defects.push('电梯老化');
  if (defects.length === 0 && rand() < 0.4) defects.push(pick(RISK_KEYWORDS_POOL));

  const survey: AssetAiFeatures['survey'] = {
    investigator: pick(INVESTIGATORS),
    survey_date: `2024-0${ri(1, 9)}-${String(ri(1, 28)).padStart(2, '0')}`,
    site_photos_count: ri(8, 24),
    defects,
    manual_adjustment_coef: Number((0.85 + cond / 100 + r(-0.05, 0.1)).toFixed(2)),
    adjustment_reason:
      defects.length > 0
        ? defects.join('；') + '，建议人工现场复核'
        : '现场无明显瑕疵，按系统建议执行',
  };

  // ===== 9. POI 1km 内 =====
  const poi: AssetAiFeatures['poi'] = {
    metro_stations: asset.features.subway_distance < 800 ? ri(1, 3) : asset.features.subway_distance < 2500 ? ri(0, 1) : 0,
    bus_stops: ri(
      business_district_tier === 'A' ? 8 : 2,
      business_district_tier === 'A' ? 16 : 8
    ),
    schools: ri(
      regionSchool[asset.region] ? Math.round(regionSchool[asset.region]) : 2,
      (regionSchool[asset.region] ?? 5) + 6
    ),
    hospitals: ri(0, business_district_tier === 'A' ? 5 : 2),
    shopping_malls: ri(0, business_district_tier === 'A' ? 4 : 1),
    parks: ri(0, business_district_tier === 'A' ? 3 : 1),
  };

  // ===== 10. 数据来源时间戳 =====
  const data_sources: AssetAiFeatures['data_sources'] = {
    erp_synced_at: '2026-07-24T02:00:00',
    external_crawled_at: '2026-07-23T18:30:00',
    ocr_extracted_at: ocr.last_valuation_date + 'T09:15:00',
    survey_at: survey.survey_date + 'T14:30:00',
    nlp_at: survey.survey_date + 'T16:00:00',
    poi_metadata_version: '2026-Q2',
  };

  return {
    basic,
    location,
    physical,
    trade,
    ocr,
    competitor,
    auction,
    survey,
    poi,
    data_sources,
  };
}
