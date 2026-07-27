/**
 * Mock 数据全量迁移脚本
 * 运行：cd server && npm run db:migrate-mocks
 *
 * 将前端所有 mock 数据导入 SQLite 数据库：
 *   - 25 条 mock 资产 (assets.json) + 200 条程序化资产 = 225 条
 *   - 25 条 mock 竞品 (competitors.json) + 300 条程序化竞品 = 325 条
 *   - 每条资产的 AI 特征 10 组
 *   - 每条资产的历史成交记录 (2-7 条/资产)
 *   - POI 数据（地铁线/商圈/热力点）
 *   - 爬虫任务 (6 条)
 *   - 数据源配置 (6 条)
 *
 * 注意：前端生成器使用 @/ 别名，后端不能直接 import，
 *      因此本脚本自包含所有生成逻辑（与前端代码保持一致）。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getDb, initSchema, closeDb } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_MOCKS = join(__dirname, '../../../src/mocks');

// ============================================================
// 工具函数（复制自前端，保持一致）
// ============================================================
function seedRand(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function ib(rand: () => number, lo: number, hi: number): number {
  return Math.floor(rand() * (hi - lo + 1)) + lo;
}
function fb(rand: () => number, lo: number, hi: number, dec = 2): number {
  return Number((rand() * (hi - lo) + lo).toFixed(dec));
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ============================================================
// 坐标池（复制自 extendedMockGenerator.ts）
// ============================================================
const HOTSPOTS: Array<{
  city: string; region: string; sub: string; lng: number; lat: number; weight: number;
}> = [
  { city: '北京', region: '朝阳区', sub: '国贸 CBD', lng: 116.460, lat: 39.913, weight: 18 },
  { city: '北京', region: '朝阳区', sub: '国贸三期', lng: 116.460, lat: 39.911, weight: 8 },
  { city: '北京', region: '朝阳区', sub: '三里屯', lng: 116.456, lat: 39.937, weight: 6 },
  { city: '北京', region: '朝阳区', sub: '望京', lng: 116.478, lat: 39.997, weight: 10 },
  { city: '北京', region: '朝阳区', sub: '亚奥', lng: 116.395, lat: 40.003, weight: 5 },
  { city: '北京', region: '朝阳区', sub: '酒仙桥', lng: 116.490, lat: 39.985, weight: 4 },
  { city: '北京', region: '朝阳区', sub: '朝阳公园', lng: 116.488, lat: 39.940, weight: 4 },
  { city: '北京', region: '朝阳区', sub: '大望路', lng: 116.484, lat: 39.913, weight: 4 },
  { city: '北京', region: '朝阳区', sub: '管庄', lng: 116.575, lat: 39.910, weight: 3 },
  { city: '北京', region: '朝阳区', sub: '垡头', lng: 116.435, lat: 39.864, weight: 2 },
  { city: '北京', region: '朝阳区', sub: '十八里店', lng: 116.475, lat: 39.851, weight: 2 },
  { city: '北京', region: '海淀区', sub: '中关村', lng: 116.310, lat: 39.984, weight: 12 },
  { city: '北京', region: '海淀区', sub: '西二旗', lng: 116.307, lat: 40.045, weight: 8 },
  { city: '北京', region: '海淀区', sub: '上地', lng: 116.305, lat: 40.040, weight: 5 },
  { city: '北京', region: '海淀区', sub: '学院路', lng: 116.338, lat: 39.998, weight: 4 },
  { city: '北京', region: '海淀区', sub: '五道口', lng: 116.337, lat: 39.992, weight: 4 },
  { city: '北京', region: '海淀区', sub: '公主坟', lng: 116.310, lat: 39.913, weight: 3 },
  { city: '北京', region: '海淀区', sub: '魏公村', lng: 116.318, lat: 39.962, weight: 3 },
  { city: '北京', region: '海淀区', sub: '苏州桥', lng: 116.305, lat: 39.965, weight: 2 },
  { city: '北京', region: '东城区', sub: '王府井', lng: 116.418, lat: 39.913, weight: 6 },
  { city: '北京', region: '东城区', sub: '东直门', lng: 116.425, lat: 39.938, weight: 5 },
  { city: '北京', region: '东城区', sub: '建国门', lng: 116.435, lat: 39.910, weight: 4 },
  { city: '北京', region: '西城区', sub: '金融街', lng: 116.359, lat: 39.918, weight: 8 },
  { city: '北京', region: '西城区', sub: '西单', lng: 116.371, lat: 39.910, weight: 4 },
  { city: '北京', region: '西城区', sub: '宣武门', lng: 116.378, lat: 39.898, weight: 3 },
  { city: '北京', region: '丰台区', sub: '丽泽商务区', lng: 116.330, lat: 39.870, weight: 6 },
  { city: '北京', region: '丰台区', sub: '六里桥', lng: 116.296, lat: 39.876, weight: 3 },
  { city: '北京', region: '通州区', sub: '运河商务区', lng: 116.659, lat: 39.909, weight: 6 },
  { city: '北京', region: '大兴区', sub: '亦庄', lng: 116.512, lat: 39.804, weight: 6 },
  { city: '北京', region: '大兴区', sub: '黄村', lng: 116.330, lat: 39.728, weight: 2 },
  { city: '北京', region: '昌平区', sub: '回龙观', lng: 116.339, lat: 40.073, weight: 3 },
  { city: '北京', region: '顺义区', sub: '天竺', lng: 116.654, lat: 40.121, weight: 2 },
  { city: '上海', region: '浦东新区', sub: '陆家嘴', lng: 121.505, lat: 31.238, weight: 14 },
  { city: '上海', region: '浦东新区', sub: '世纪大道', lng: 121.520, lat: 31.230, weight: 5 },
  { city: '上海', region: '浦东新区', sub: '张江高科', lng: 121.602, lat: 31.204, weight: 6 },
  { city: '上海', region: '浦东新区', sub: '金桥', lng: 121.602, lat: 31.252, weight: 3 },
  { city: '上海', region: '浦东新区', sub: '前滩', lng: 121.526, lat: 31.180, weight: 3 },
  { city: '上海', region: '浦东新区', sub: '世博园', lng: 121.490, lat: 31.182, weight: 3 },
  { city: '上海', region: '浦东新区', sub: '花木', lng: 121.553, lat: 31.213, weight: 2 },
  { city: '上海', region: '徐汇区', sub: '徐家汇', lng: 121.436, lat: 31.196, weight: 8 },
  { city: '上海', region: '徐汇区', sub: '漕河泾', lng: 121.400, lat: 31.180, weight: 5 },
  { city: '上海', region: '徐汇区', sub: '淮海中路', lng: 121.456, lat: 31.213, weight: 4 },
  { city: '上海', region: '黄浦区', sub: '人民广场', lng: 121.474, lat: 31.232, weight: 6 },
  { city: '上海', region: '黄浦区', sub: '外滩', lng: 121.490, lat: 31.236, weight: 4 },
  { city: '上海', region: '黄浦区', sub: '新天地', lng: 121.479, lat: 31.222, weight: 3 },
  { city: '上海', region: '静安区', sub: '南京西路', lng: 121.450, lat: 31.225, weight: 6 },
  { city: '上海', region: '静安区', sub: '静安寺', lng: 121.445, lat: 31.223, weight: 4 },
  { city: '上海', region: '静安区', sub: '大宁', lng: 121.450, lat: 31.272, weight: 3 },
  { city: '上海', region: '长宁区', sub: '中山公园', lng: 121.418, lat: 31.222, weight: 4 },
  { city: '上海', region: '长宁区', sub: '虹桥', lng: 121.380, lat: 31.197, weight: 4 },
  { city: '上海', region: '杨浦区', sub: '五角场', lng: 121.515, lat: 31.300, weight: 3 },
  { city: '上海', region: '普陀区', sub: '长寿路', lng: 121.450, lat: 31.245, weight: 3 },
  { city: '上海', region: '虹口区', sub: '四川北路', lng: 121.480, lat: 31.265, weight: 3 },
  { city: '上海', region: '闵行区', sub: '莘庄', lng: 121.385, lat: 31.110, weight: 3 },
  { city: '深圳', region: '福田区', sub: '福田 CBD', lng: 114.055, lat: 22.535, weight: 5 },
  { city: '深圳', region: '南山区', sub: '科技园', lng: 113.940, lat: 22.535, weight: 4 },
  { city: '广州', region: '天河区', sub: '珠江新城', lng: 113.330, lat: 23.130, weight: 5 },
  { city: '杭州', region: '上城区', sub: '钱江新城', lng: 120.205, lat: 30.245, weight: 4 },
  { city: '成都', region: '双流区', sub: '天府新区', lng: 104.062, lat: 30.580, weight: 3 },
];

const TYPE_POOL: Array<[string, number, number]> = [
  ['office', 35, 6.5], ['retail', 20, 8.0], ['apartment', 15, 4.5],
  ['plant', 12, 1.4], ['warehouse', 10, 1.2], ['hotel', 8, 5.0],
];

function pickHotspot(rand: () => number) {
  const total = HOTSPOTS.reduce((s, h) => s + h.weight, 0);
  const r = rand() * total;
  let cum = 0;
  for (const h of HOTSPOTS) { cum += h.weight; if (r <= cum) return h; }
  return HOTSPOTS[0];
}
function pickType(rand: () => number): [string, number] {
  const total = TYPE_POOL.reduce((s, t) => s + t[1], 0);
  const r = rand() * total;
  let cum = 0;
  for (const t of TYPE_POOL) { cum += t[1]; if (r <= cum) return [t[0], t[2]]; }
  return ['office', 6.5];
}

// ============================================================
// 资产生成器（复制自 extendedMockGenerator.ts generateOneAsset）
// ============================================================
interface AssetData {
  id: string; name: string; address?: string; lnglat: [number, number];
  area: number; status: string; days_vacant: number; type: string;
  estimated_price: number; monthly_rent?: number; occupancy_rate?: number;
  confidence: number; region: string; received_batch: string;
  certificate_status: string; decoration_level?: string; last_renovation?: number;
  default_free_rent_days?: number; images?: string[]; hidden_risks?: string[];
  features: { subway_distance: number; condition_score: number };
  ai_features?: Record<string, unknown>;
  historical_transactions?: TransactionData[];
}

interface TransactionData {
  id: string; date: string; price_per_m2: number; tenant: string;
  type: string; lease_term_months: number; free_rent_days: number;
  deposit_months: number; annual_increment_pct: number;
  status: string; performance: string; notes?: string;
}

const STRUCTURES = ['frame', 'brick', 'mixed'] as const;
const COMP_SOURCES = ['beike', '58', 'fangtianxia', 'lianjia'] as const;

function generateOneAsset(idx: number): AssetData {
  const id = `RT-${String(idx).padStart(4, '0')}`;
  const rand = seedRand(hashStr(id));
  const hs = pickHotspot(rand);
  const [type, typeBase] = pickType(rand);
  const area = type === 'warehouse' || type === 'plant' ? ib(rand, 800, 22000)
    : type === 'hotel' || type === 'retail' ? ib(rand, 300, 9000)
    : type === 'apartment' ? ib(rand, 1500, 6000) : ib(rand, 800, 18000);
  const status = rand() < 0.42 ? 'leased' : rand() < 0.78 ? 'vacant' : 'renovating';
  const subway_distance = hs.sub.includes('地铁') || rand() < 0.6 ? ib(rand, 100, 800) : ib(rand, 800, 4500);
  const condition_score = clamp(ib(rand, 2, 9) + (rand() < 0.3 ? -1 : 0), 1, 10);
  const last_renovation = condition_score >= 7 ? ib(rand, 2018, 2024) : ib(rand, 2005, 2019);
  const regionCoef = subway_distance < 500 ? 1.0 : subway_distance < 1500 ? 0.95 : 0.85;
  const condCoef = 1 + (condition_score - 5) * 0.02;
  const deco = pick(rand, ['rough', 'simple', 'standard', 'fine']);
  const decoCoef: Record<string, number> = { rough: 0.78, simple: 0.88, standard: 1.0, fine: 1.18 };
  const estimated_price = Number((typeBase * regionCoef * condCoef * decoCoef[deco] * (0.95 + rand() * 0.1)).toFixed(2));
  const hidden_risks: string[] = [];
  if (rand() < 0.18) hidden_risks.push('special_license');
  if (rand() < 0.15) hidden_risks.push('clear_eviction');
  if (rand() < 0.12) hidden_risks.push('military_legacy');
  if (rand() < 0.1) hidden_risks.push('covenant_limit');
  if (rand() < 0.18 && condition_score < 4) hidden_risks.push('fire_safety');
  if (rand() < 0.06) hidden_risks.push('tax_issue');
  if (rand() < 0.08) hidden_risks.push('mortgage');
  const days_vacant = status === 'vacant' ? ib(rand, 5, 360) : 0;
  const monthly_rent = Math.round(estimated_price * area * 30);
  const photoCount = ib(rand, 4, 22);

  return {
    id, name: `${hs.sub}${type === 'office' ? '写字楼' : type === 'retail' ? '底商' : type === 'hotel' ? '酒店' : type === 'apartment' ? '公寓' : type === 'plant' ? '工业园' : '仓储'}-${idx}`,
    address: `${hs.city}市${hs.region}${hs.sub}核心区 ${ib(rand, 1, 200)} 号`,
    lnglat: [Number((hs.lng + (rand() - 0.5) * 0.012).toFixed(6)), Number((hs.lat + (rand() - 0.5) * 0.010).toFixed(6))],
    area, status, days_vacant, type, estimated_price, monthly_rent,
    occupancy_rate: status === 'leased' ? fb(rand, 0.7, 0.98) : 0,
    confidence: fb(rand, 0.5, 0.97), region: hs.region,
    received_batch: pick(rand, ['batch-1', 'batch-2', 'batch-3', 'batch-4']),
    certificate_status: rand() < 0.7 ? 'complete' : rand() < 0.9 ? 'pending' : 'missing',
    decoration_level: deco, last_renovation, default_free_rent_days: ib(rand, 0, 90),
    images: Array.from({ length: photoCount }, (_, i) => `photo-${id}-${i}`),
    hidden_risks, features: { subway_distance, condition_score },
  };
}

// ============================================================
// 竞品生成器（复制自 extendedMockGenerator.ts generateOneCompetitor）
// ============================================================
interface CompetitorData {
  id: string; name: string; lnglat: [number, number]; region: string;
  type: string; list_price: number; property_fee: number;
  occupancy_rate: number; source: string; captured_at: string; layout?: string;
}

function generateOneCompetitor(idx: number): CompetitorData {
  const id = `C-${String(idx).padStart(4, '0')}`;
  const rand = seedRand(hashStr(id));
  const hs = pickHotspot(rand);
  const type = pick(rand, TYPE_POOL)[0];
  const tierBase = hs.region.includes('东城') || hs.region.includes('西城') || hs.region.includes('朝阳') || hs.region.includes('海淀') || hs.region.includes('黄浦') || hs.region.includes('徐汇') || hs.region.includes('浦东') || hs.region.includes('静安') ? 8.5
    : hs.region.includes('通州') || hs.region.includes('丰台') || hs.region.includes('长宁') || hs.region.includes('杨浦') ? 4.5 : 2;
  return {
    id, name: `${hs.sub}${pick(rand, ['·银座', '·大厦', '·中心', '', 'SOHO', '·汇', '·广场', ''])}${ib(rand, 1, 18)}号楼`,
    lnglat: [Number((hs.lng + (rand() - 0.5) * 0.015).toFixed(6)), Number((hs.lat + (rand() - 0.5) * 0.012).toFixed(6))],
    region: hs.region, type,
    list_price: Number((tierBase * fb(rand, 0.85, 1.25)).toFixed(2)),
    property_fee: ib(rand, 8, 32), occupancy_rate: fb(rand, 0.6, 0.95),
    source: pick(rand, [...COMP_SOURCES]), captured_at: '2026-07-2' + ib(rand, 0, 4),
    layout: `${ib(rand, 30, 200)}-${ib(rand, 80, 2500)}㎡`,
  };
}

// ============================================================
// AI 特征生成器（复制自 aiFeaturesMock.ts）
// ============================================================
const INVESTIGATORS = ['王明', '张磊', '陈思敏', '李楠', '赵玮', '周航'];
const VALUATION_COMPANIES = ['中瑞世联', '国策评估', '世联行', '戴德梁行', '第一太平戴维斯', '中原地产'];
const HIGHLIGHTS_BY_TYPE: Record<string, string[]> = {
  office: ['CBD 核心', '甲级写字楼', '5A 智能化', '近地铁'],
  retail: ['临街展示面', '客流密集', '餐饮禁入不限', '商业氛围浓'],
  hotel: ['连锁品牌入驻', '商旅需求', '精装客房', '电梯独立'],
  apartment: ['白领聚集', '通勤便利', '周边配套齐全', '精装出租'],
  plant: ['独立院落', '路网成熟', '电力充沛', '厂房规范化'],
  warehouse: ['高货架', '电梯月台', '园区物业', '24h 安保'],
};
const RISK_KEYWORDS_POOL = ['产权瑕疵', '强电整改', '电梯老化', '消防升级', '噪音扰民', '管线老化', '渗水维修'];

function generateAiFeatures(asset: AssetData): Record<string, unknown> {
  let seed = 0;
  for (const ch of asset.id + asset.name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = seedRand(seed);
  const r = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const ri = (lo: number, hi: number) => Math.floor(r(lo, hi + 1));
  const pk = <T>(arr: T[]): T => arr[ri(0, arr.length - 1)];

  const isNewBuilding = (asset.last_renovation ?? 2010) > 2020;
  const structure = pk([...STRUCTURES]);
  const above_ground_floors = asset.area > 15000 ? ri(4, 9) : asset.area > 5000 ? ri(6, 18) : ri(2, 6);
  const parking_spaces = Math.floor(asset.area / 80);
  const elevator_count = above_ground_floors >= 10 ? ri(3, 6) : above_ground_floors >= 5 ? ri(2, 3) : ri(0, 1);

  const CBD_REGIONS = ['东城区', '西城区'];
  const INNER_RING = ['朝阳区', '海淀区', '丰台区'];
  const isCBD = CBD_REGIONS.includes(asset.region);
  const isInner = INNER_RING.includes(asset.region);
  const distance_to_cbd_km = isCBD ? r(0.5, 3) : isInner ? r(3, 8) : r(10, 28);
  const distance_to_airport_km = isCBD ? r(22, 28) : isInner ? r(25, 35) : r(30, 65);

  const regionSchool: Record<string, number> = { '东城区': 9.5, '西城区': 9.4, '海淀区': 9.2, '朝阳区': 7.8, '丰台区': 6.5, '通州区': 6.0, '昌平区': 5.4, '大兴区': 5.0, '顺义区': 4.6, '房山区': 3.5 };
  const school_score = Number(((regionSchool[asset.region] ?? 5) + r(-0.4, 0.4)).toFixed(1));
  const hospital_score = Number((Math.min(10, school_score + r(-1, 1))).toFixed(1));
  const commercial_density = Number(Math.min(10, Math.max(0, asset.features.subway_distance < 1000 ? r(7, 10) : r(3, 7))).toFixed(1));
  const TIERS_A = ['东城区', '西城区', '朝阳区', '海淀区'];
  const TIERS_B = ['通州区', '丰台区'];
  const business_district_tier = TIERS_A.includes(asset.region) ? 'A' : TIERS_B.includes(asset.region) ? 'B' : 'C';
  const surrounding_tower_count = ri(business_district_tier === 'A' ? 12 : business_district_tier === 'B' ? 4 : 1, business_district_tier === 'A' ? 35 : business_district_tier === 'B' ? 12 : 4);
  const population_density_pkm2 = ri(business_district_tier === 'A' ? 15000 : business_district_tier === 'B' ? 5000 : 800, business_district_tier === 'A' ? 30000 : business_district_tier === 'B' ? 18000 : 6000);

  const cond = asset.features.condition_score;
  const facade_score = Number(Math.min(10, Math.max(0, cond + r(-0.7, 0.7))).toFixed(1));
  const structure_score = Number(Math.min(10, Math.max(0, cond + r(-1, 1))).toFixed(1));
  const lighting_score = Number(Math.min(10, Math.max(0, cond * 0.9 + r(-0.5, 1))).toFixed(1));
  const ventilation_score = Number(Math.min(10, Math.max(0, cond * 0.95 + r(-0.4, 0.8))).toFixed(1));
  const noise_db = Math.floor(Math.min(80, Math.max(35, 40 + (asset.features.subway_distance < 500 ? 12 : 0) + r(0, 15))));
  const sunlight_hours = Number(Math.min(8, Math.max(2, (cond / 10) * 5 + r(0.5, 1.8))).toFixed(1));
  const baseKeywords = HIGHLIGHTS_BY_TYPE[asset.type] ?? ['交通便利', '方正户型'];
  const nlp_keywords = [...baseKeywords.slice(0, 3), `距地铁 ${asset.features.subway_distance}m`, `成新分 ${cond}/10`];
  const nlp_highlights = baseKeywords.slice(0, 3);
  const nlp_risks: string[] = [];
  if (cond < 4) nlp_risks.push('成新差');
  if (noise_db > 65) nlp_risks.push('噪音偏大');
  if (asset.features.subway_distance > 5000) nlp_risks.push('远郊');
  if (asset.certificate_status === 'missing') nlp_risks.push('权证缺失');
  if (asset.hidden_risks?.includes('fire_safety')) nlp_risks.push('消防不达标');
  if (nlp_risks.length === 0) nlp_risks.push(pk(RISK_KEYWORDS_POOL));

  const trade_count = asset.status === 'leased' ? ri(2, 6) : asset.status === 'vacant' ? ri(0, 3) : 0;
  const last_trade_date = trade_count === 0 ? null : `20${23 - (trade_count > 4 ? 0 : 1)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`;
  const last_trade_per_m2 = trade_count === 0 ? null : Number((asset.estimated_price * r(0.85, 1.15)).toFixed(2));
  const total_volume_yuan = trade_count > 0 ? Math.floor(asset.estimated_price * asset.area * 365 * trade_count * r(0.5, 1.0)) : 0;
  const overdue_count = ri(0, trade_count > 1 ? 2 : 0);
  const contract_completion_rate = Number(Math.max(0.6, Math.min(1, 1 - overdue_count * 0.07 + r(-0.05, 0.05))).toFixed(2));

  const defects: string[] = [];
  if (cond < 4) defects.push('外墙局部脱落');
  if (noise_db > 68) defects.push('临街噪声明显');
  if (elevator_count === 0 && above_ground_floors > 3) defects.push('无电梯');
  if (above_ground_floors > 6 && cond < 6) defects.push('电梯老化');
  if (defects.length === 0 && rand() < 0.4) defects.push(pk(RISK_KEYWORDS_POOL));

  return {
    basic: { completion_year: asset.last_renovation ?? ri(1998, 2018), building_structure: structure, above_ground_floors, parking_spaces, elevator_count, land_area_sqm: Math.floor(asset.area * r(0.8, 1.2)) },
    location: { distance_to_cbd_km: Number(distance_to_cbd_km.toFixed(1)), distance_to_airport_km: Number(distance_to_airport_km.toFixed(1)), school_score, hospital_score, commercial_density, business_district_tier, surrounding_tower_count, population_density_pkm2 },
    physical: { facade_score, structure_score, lighting_score, ventilation_score, noise_db, sunlight_hours, nlp_keywords, nlp_highlights, nlp_risks },
    trade: { trade_count, last_trade_date, last_trade_per_m2, total_volume_yuan, avg_free_rent_days: asset.default_free_rent_days ?? 30, overdue_count, contract_completion_rate, average_deposit_months: ri(1, 3) },
    ocr: { last_valuation_company: pk(VALUATION_COMPANIES), last_valuation_date: `2024-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`, last_valuation_per_m2: Number((asset.estimated_price * r(0.92, 1.05)).toFixed(2)), pdf_url: `https://valuation.rtasset.internal/${asset.id}.pdf`, confidence: Number(Math.min(0.99, Math.max(0.7, cond / 10 + r(-0.05, 0.08))).toFixed(2)) },
    competitor: { listings_3km: ri(business_district_tier === 'A' ? 12 : business_district_tier === 'B' ? 4 : 1, business_district_tier === 'A' ? 35 : business_district_tier === 'B' ? 15 : 6), avg_listing_price: Number((asset.estimated_price * r(0.85, 1.25)).toFixed(2)), lowest_listing_price: Number((asset.estimated_price * r(0.6, 0.85)).toFixed(2)), highest_listing_price: Number((asset.estimated_price * r(1.2, 1.6)).toFixed(2)), avg_negotiation_strength: Number(Math.min(0.4, Math.max(0.05, r(0.05, 0.3))).toFixed(2)), last_crawl_at: '2026-07-23' },
    auction: { failed_count: asset.certificate_status === 'missing' ? ri(1, 3) : ri(0, 1), last_failed_date: null, lowest_call_price_ratio: 0 },
    survey: { investigator: pk(INVESTIGATORS), survey_date: `2024-0${ri(1, 9)}-${String(ri(1, 28)).padStart(2, '0')}`, site_photos_count: ri(8, 24), defects, manual_adjustment_coef: Number((0.85 + cond / 100 + r(-0.05, 0.1)).toFixed(2)), adjustment_reason: defects.length > 0 ? defects.join('；') + '，建议人工现场复核' : '现场无明显瑕疵，按系统建议执行' },
    poi: { metro_stations: asset.features.subway_distance < 800 ? ri(1, 3) : asset.features.subway_distance < 2500 ? ri(0, 1) : 0, bus_stops: ri(business_district_tier === 'A' ? 8 : 2, business_district_tier === 'A' ? 16 : 8), schools: ri(regionSchool[asset.region] ? Math.round(regionSchool[asset.region]) : 2, (regionSchool[asset.region] ?? 5) + 6), hospitals: ri(0, business_district_tier === 'A' ? 5 : 2), shopping_malls: ri(0, business_district_tier === 'A' ? 4 : 1), parks: ri(0, business_district_tier === 'A' ? 3 : 1) },
    data_sources: { erp_synced_at: '2026-07-24T02:00:00', external_crawled_at: '2026-07-23T18:30:00', ocr_extracted_at: `2024-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}T09:15:00`, survey_at: `2024-0${ri(1,9)}-${String(ri(1,28)).padStart(2,'0')}T14:30:00`, nlp_at: `2024-0${ri(1,9)}-${String(ri(1,28)).padStart(2,'0')}T16:00:00`, poi_metadata_version: '2026-Q2' },
  };
}

// ============================================================
// 历史成交生成器（复制自 historicalTransactionMock.ts）
// ============================================================
const TENANTS_BY_TYPE: Record<string, string[]> = {
  office: ['北京银信会计师事务所', '中国机械工程研究院', '中科智远咨询集团', '联想（北京）有限公司', '北辰实业集团', '国信证券股份有限公司', '中信建投证券', '光大银行北京分行', '海航集团', '北京字节跳动', '中国民生银行', '京东集团', '新浪科技', '美团点评', '中影集团', '神州数码', '东软集团', '京东方科技集团'],
  retail: ['瑞幸咖啡', '星巴克咖啡', '海底捞餐饮', '西贝餐饮集团', '屈臣氏个人商店', '麦当劳中国', '必胜客', '苹果授权零售店', '优衣库', '李宁（中国）', '盒马鲜生', '永辉超市', '7-11便利店', '肯德基', '老乡鸡', '书亦烧仙草'],
  hotel: ['锦江酒店（北京）', '华住酒店集团', '首旅如家集团', '洲际酒店集团', '万豪国际', '雅高集团', '凯悦酒店', '格林酒店集团', '亚朵酒店集团', '尚客优酒店'],
  apartment: ['链家自如公寓', '魔方公寓', '建信住房服务', '蛋壳公寓', '万科泊寓', '华润有巢', '旭辉瓴寓', '中海友里', '招商伊敦公寓', '龙湖冠寓'],
  warehouse: ['京东物流', '顺丰速运', '中通快递', '圆通速递', '申通快递', '德邦物流', '中国邮政速递', '安能物流', '百世快递', '韵达速递'],
  plant: ['比亚迪汽车工业', '富士康精密工业', '美的集团', '格力电器', '海尔智家', '北汽集团', '三一重工', '徐工集团', '宁德时代新能源'],
};
const NOTES_POOL = ['中标国资委协议', '续约谈判 3 个月敲定', '招商局引荐客户', '公开招租 17 家竞标', '总部推荐大客户', '部队内部周转', '资产接收初期免租优惠', '产业园区战略合作', '商务谈判周期较长', '续约阶段谈判顺利'];
const TYPE_LEASE_CONFIG: Record<string, { baseTermMonths: number; termJitterMonths: number; baseFreeRentDays: number; freeRentRatio: number; depositMonths: number; baseAnnualIncrement: number }> = {
  office: { baseTermMonths: 36, termJitterMonths: 12, baseFreeRentDays: 30, freeRentRatio: 0.03, depositMonths: 3, baseAnnualIncrement: 3.5 },
  retail: { baseTermMonths: 18, termJitterMonths: 12, baseFreeRentDays: 30, freeRentRatio: 0.05, depositMonths: 2, baseAnnualIncrement: 4.0 },
  hotel: { baseTermMonths: 60, termJitterMonths: 24, baseFreeRentDays: 60, freeRentRatio: 0.04, depositMonths: 3, baseAnnualIncrement: 3.0 },
  apartment: { baseTermMonths: 12, termJitterMonths: 6, baseFreeRentDays: 7, freeRentRatio: 0.02, depositMonths: 1, baseAnnualIncrement: 5.0 },
  warehouse: { baseTermMonths: 36, termJitterMonths: 12, baseFreeRentDays: 45, freeRentRatio: 0.04, depositMonths: 2, baseAnnualIncrement: 2.5 },
  plant: { baseTermMonths: 60, termJitterMonths: 24, baseFreeRentDays: 90, freeRentRatio: 0.06, depositMonths: 3, baseAnnualIncrement: 2.0 },
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function fmtDate(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addMonths(d: Date, months: number): Date { const out = new Date(d); out.setMonth(out.getMonth() + months); return out; }

function generateHistoryFor(asset: AssetData): TransactionData[] {
  const seed = hashStr(asset.id + '_history');
  const rand = seedRand(seed);
  const start = new Date('2019-01-01');
  const end = new Date('2026-07-01');
  let count: number;
  if (asset.status === 'leased') count = Math.floor(rand() * 5) + 3;
  else if (asset.status === 'renovating') count = Math.floor(rand() * 4) + 2;
  else count = Math.floor(rand() * 3) + 2;
  const cfg = TYPE_LEASE_CONFIG[asset.type] ?? TYPE_LEASE_CONFIG.office;
  const tenants = TENANTS_BY_TYPE[asset.type] ?? TENANTS_BY_TYPE.office;
  let basePrice = asset.estimated_price * (0.7 + rand() * 0.15);
  const out: TransactionData[] = [];
  const totalSpanMs = end.getTime() - start.getTime();
  const intervalMs = totalSpanMs / count;
  let cursorMs = start.getTime();
  const perfFor = (): string => {
    const r2 = rand();
    if (asset.status === 'leased') return r2 < 0.78 ? 'good' : r2 < 0.92 ? 'early_exit' : 'overdue';
    if (asset.status === 'renovating') return r2 < 0.6 ? 'good' : r2 < 0.85 ? 'early_exit' : 'overdue';
    return r2 < 0.5 ? 'good' : r2 < 0.8 ? 'early_exit' : 'overdue';
  };
  for (let i = 0; i < count; i++) {
    const jitter = (rand() - 0.5) * 0.6 * intervalMs;
    const txDate = new Date(cursorMs + jitter);
    const annualRise = cfg.baseAnnualIncrement + (rand() - 0.5) * 2.5;
    basePrice = basePrice * (1 + annualRise / 100);
    const year = txDate.getFullYear();
    if (year === 2020 && asset.type !== 'warehouse') basePrice *= 0.92;
    if (year === 2022) basePrice *= 1.06;
    if (asset.features.subway_distance < 200) basePrice *= 1.05;
    const price = Number(basePrice.toFixed(2));
    const termMonths = Math.max(6, cfg.baseTermMonths + Math.floor((rand() - 0.5) * cfg.termJitterMonths));
    const freeRent = Math.round(cfg.baseFreeRentDays + cfg.freeRentRatio * termMonths * 30 + (rand() - 0.5) * 14);
    const depositMonths = Math.max(1, cfg.depositMonths + Math.floor((rand() - 0.5) * 1));
    const increment = Number(Math.max(0, cfg.baseAnnualIncrement + (rand() - 0.5) * 2).toFixed(1));
    let status = 'handover';
    if (i > 0) status = i % 3 === 0 ? 'renewal' : 'new';
    const perf = perfFor();
    const notes = rand() < 0.2 ? (rand() < 0.5 ? pick(rand, NOTES_POOL) : perf === 'overdue' ? '客户出现资金压力，已启动协商' : perf === 'early_exit' ? '租客提前 3 个月退租，已接手新客户' : '履约良好，按时付款') : undefined;
    out.push({ id: `TX-${asset.id}-${String(i).padStart(3, '0')}`, date: fmtDate(txDate), price_per_m2: price, tenant: pick(rand, tenants), type: asset.type, lease_term_months: termMonths, free_rent_days: freeRent, deposit_months: depositMonths, annual_increment_pct: increment, status, performance: perf, notes });
    const vacantGapMonths = perf === 'early_exit' ? 1 + Math.floor(rand() * 3) : 0;
    cursorMs = addMonths(txDate, termMonths + vacantGapMonths).getTime();
  }
  if (out.length > 0 && asset.status === 'leased') {
    out[out.length - 1].price_per_m2 = Number(asset.estimated_price.toFixed(2));
  }
  return out;
}

// ============================================================
// 迁移主逻辑
// ============================================================
function migrate(): void {
  initSchema();
  const db = getDb();
  const now = new Date().toISOString();

  console.log('[migrate] 开始导入 mock 数据...');

  // 1. 数据源
  console.log('[migrate] 导入数据源...');
  const sources = [
    { id: 'src-beike', name: '贝壳', source_type: 'crawler', base_url: 'https://bj.ke.com', rate_limit_per_min: 30 },
    { id: 'src-58', name: '58同城', source_type: 'crawler', base_url: 'https://bj.58.com', rate_limit_per_min: 30 },
    { id: 'src-fangtianxia', name: '房天下', source_type: 'crawler', base_url: 'https://office.fang.com', rate_limit_per_min: 20 },
    { id: 'src-lianjia', name: '链家', source_type: 'crawler', base_url: 'https://bj.lianjia.com', rate_limit_per_min: 30 },
    { id: 'src-amap', name: '高德POI', source_type: 'api', base_url: 'https://restapi.amap.com/v3/place/around', rate_limit_per_min: 200 },
    { id: 'src-gov-bj', name: '北京市规自委', source_type: 'crawler', base_url: 'https://ghzrzyw.beijing.gov.cn', rate_limit_per_min: 10 },
  ];
  const stmtSrc = db.prepare(`INSERT OR IGNORE INTO data_sources (id, name, source_type, base_url, rate_limit_per_min, enabled) VALUES (?, ?, ?, ?, ?, 1)`);
  for (const s of sources) stmtSrc.run(s.id, s.name, s.source_type, s.base_url, s.rate_limit_per_min);

  // 2. 爬虫任务（从 mocks/crawler_tasks.json 读取）
  console.log('[migrate] 导入爬虫任务...');
  const crawlerTasks = JSON.parse(readFileSync(join(FRONTEND_MOCKS, 'crawler_tasks.json'), 'utf-8')) as Array<Record<string, unknown>>;
  const stmtTask = db.prepare(`INSERT OR IGNORE INTO crawl_tasks (id, name, source, task_type, region, schedule_cron, status, last_run_at, record_count, manual_calibrated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const taskNameMap: Record<string, string> = { 'task-001': '朝阳-贝壳竞品抓取', 'task-002': '海淀-58竞品抓取', 'task-003': '丰台-房天下竞品抓取', 'task-004': '通州-贝壳竞品抓取', 'task-005': '西城-链家竞品抓取', 'task-006': '东城-58竞品抓取' };
  for (const t of crawlerTasks) {
    stmtTask.run(t.id, taskNameMap[t.id as string] ?? `任务${t.id}`, t.source, 'competitor', t.region, t.schedule as string, t.status, t.last_run_at as string, t.record_count as number, (t.manual_calibrated as number) ?? 0);
  }

  // 3. POI 数据（从 mocks/poi.json 读取地铁/商圈/热力）
  console.log('[migrate] 导入 POI 数据...');
  const poiData = JSON.parse(readFileSync(join(FRONTEND_MOCKS, 'poi.json'), 'utf-8')) as { metro: Array<{ id: string; name: string; coordinates: [number, number][] }>; districts: Array<{ id: string; name: string; center: [number, number] }>; hot: Array<{ id: string; center: [number, number]; intensity: number }> };
  const stmtPoi = db.prepare(`INSERT OR IGNORE INTO poi_data (id, source, name, category, sub_type, lng, lat, captured_at) VALUES (?, 'mock', ?, ?, ?, ?, ?, ?)`);
  let poiIdx = 0;
  for (const line of poiData.metro) {
    for (const coord of line.coordinates) {
      poiIdx++;
      stmtPoi.run(`poi-metro-${poiIdx}`, `${line.name}站点`, 'metro', '地铁站', coord[0], coord[1], now);
    }
  }
  for (const d of poiData.districts) {
    poiIdx++;
    stmtPoi.run(`poi-district-${d.id}`, d.name, 'shopping', '商圈', d.center[0], d.center[1], now);
  }
  for (const h of poiData.hot) {
    poiIdx++;
    stmtPoi.run(`poi-hot-${h.id}`, `热力点${h.id}`, 'shopping', '人口热力', h.center[0], h.center[1], now);
  }

  // 4. 读取 25 条 mock 资产 + 生成 200 条程序化资产
  console.log('[migrate] 生成资产数据（25 mock + 200 程序化）...');
  const mockAssets = JSON.parse(readFileSync(join(FRONTEND_MOCKS, 'assets.json'), 'utf-8')) as AssetData[];
  const generatedAssets = Array.from({ length: 200 }, (_, i) => generateOneAsset(i + 1));
  const allAssets = [...mockAssets, ...generatedAssets];

  // 为每条资产补充 AI 特征 + 历史成交
  for (const asset of allAssets) {
    if (!asset.ai_features) asset.ai_features = generateAiFeatures(asset);
    if (!asset.historical_transactions || asset.historical_transactions.length === 0) {
      asset.historical_transactions = generateHistoryFor(asset);
    }
  }
  console.log(`[migrate] 共 ${allAssets.length} 条资产（含 AI 特征 + 历史成交）`);

  // 5. 批量写入资产
  console.log('[migrate] 导入资产主表...');
  const stmtAsset = db.prepare(`
    INSERT OR IGNORE INTO assets
      (id, name, address, lng, lat, area, status, days_vacant, type,
       estimated_price, monthly_rent, occupancy_rate, confidence, region,
       received_batch, certificate_status, decoration_level, last_renovation,
       default_free_rent_days, hidden_risks, features_json, ai_features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let assetCount = 0;
  for (const a of allAssets) {
    const r = stmtAsset.run(
      a.id, a.name, a.address ?? null, a.lnglat[0], a.lnglat[1], a.area, a.status, a.days_vacant, a.type,
      a.estimated_price, a.monthly_rent ?? null, a.occupancy_rate ?? null, a.confidence, a.region,
      a.received_batch, a.certificate_status, a.decoration_level ?? null, a.last_renovation ?? null,
      a.default_free_rent_days ?? null,
      a.hidden_risks ? JSON.stringify(a.hidden_risks) : null,
      a.features ? JSON.stringify(a.features) : null,
      a.ai_features ? JSON.stringify(a.ai_features) : null,
    );
    if (r.changes > 0) assetCount++;
  }
  console.log(`[migrate] 资产主表: ${assetCount} 条入库`);

  // 6. 批量写入历史成交
  console.log('[migrate] 导入历史成交记录...');
  const stmtTx = db.prepare(`
    INSERT OR IGNORE INTO transactions_history
      (id, asset_id, source, source_id, property_name, region, lng, lat, type,
       deal_date, deal_price, tenant, lease_term_months, free_rent_days,
       deposit_months, annual_increment_pct, deal_type, performance, notes, captured_at)
    VALUES (?, ?, 'internal_erp', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let txCount = 0;
  for (const a of allAssets) {
    if (!a.historical_transactions) continue;
    for (const tx of a.historical_transactions) {
      const r = stmtTx.run(
        tx.id, a.id, tx.id, a.name, a.region, a.lnglat[0], a.lnglat[1], a.type,
        tx.date, tx.price_per_m2, tx.tenant, tx.lease_term_months, tx.free_rent_days,
        tx.deposit_months, tx.annual_increment_pct, tx.status, tx.performance, tx.notes ?? null, now,
      );
      if (r.changes > 0) txCount++;
    }
  }
  console.log(`[migrate] 历史成交: ${txCount} 条入库`);

  // 7. 读取 25 条 mock 竞品 + 生成 300 条程序化竞品
  console.log('[migrate] 生成竞品数据（25 mock + 300 程序化）...');
  const mockComps = JSON.parse(readFileSync(join(FRONTEND_MOCKS, 'competitors.json'), 'utf-8')) as CompetitorData[];
  const generatedComps = Array.from({ length: 300 }, (_, i) => generateOneCompetitor(i + 1));
  const allComps = [...mockComps, ...generatedComps];
  console.log(`[migrate] 共 ${allComps.length} 条竞品`);

  // 8. 批量写入竞品
  console.log('[migrate] 导入竞品挂牌数据...');
  const stmtComp = db.prepare(`
    INSERT OR IGNORE INTO competitor_listings
      (id, source, source_id, name, region, lng, lat, type,
       list_price, property_fee, occupancy_rate, layout, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let compCount = 0;
  for (const c of allComps) {
    const r = stmtComp.run(
      c.id, c.source, c.id, c.name, c.region, c.lnglat[0], c.lnglat[1], c.type,
      c.list_price, c.property_fee, c.occupancy_rate, c.layout ?? null, c.captured_at,
    );
    if (r.changes > 0) compCount++;
  }
  console.log(`[migrate] 竞品挂牌: ${compCount} 条入库`);

  // 统计
  const stats = {
    assets: (db.prepare('SELECT COUNT(*) AS c FROM assets').get() as { c: number }).c,
    competitors: (db.prepare('SELECT COUNT(*) AS c FROM competitor_listings').get() as { c: number }).c,
    transactions: (db.prepare('SELECT COUNT(*) AS c FROM transactions_history').get() as { c: number }).c,
    poi: (db.prepare('SELECT COUNT(*) AS c FROM poi_data').get() as { c: number }).c,
    crawl_tasks: (db.prepare('SELECT COUNT(*) AS c FROM crawl_tasks').get() as { c: number }).c,
    data_sources: (db.prepare('SELECT COUNT(*) AS c FROM data_sources').get() as { c: number }).c,
  };
  console.log('[migrate] 导入完成！统计:', stats);
}

migrate();
closeDb();
