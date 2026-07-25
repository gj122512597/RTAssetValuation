/**
 * 扩展 mock 生成器（N=200 资产 + 300 竞品）
 *  - 基于北京/上海真实坐标池
 *  - 业态/区域/状态分布接近真实业务
 *  - 稳定 seed（hash id）让每次生成结果一致
 */
import type { Asset, AssetAiFeatures, BusinessType, Competitor, HiddenRiskTag } from '@/types';
import { generateAiFeatures as baseAiFeatures } from './aiFeaturesMock';

// ===== 真实坐标池（精选 70+ 个真实商圈坐标）=====
export const HOTSPOTS: Array<{
  city: '北京' | '上海' | '广州' | '深圳' | '杭州' | '成都' | '苏州' | '武汉';
  region: string;
  sub: string;
  lng: number;
  lat: number;
  weight: number;
}> = [
  // 北京 (~50+)
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

  // 上海 (~30)
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

  // 其他城市
  { city: '深圳', region: '福田区', sub: '福田 CBD', lng: 114.055, lat: 22.535, weight: 5 },
  { city: '深圳', region: '南山区', sub: '科技园', lng: 113.940, lat: 22.535, weight: 4 },
  { city: '广州', region: '天河区', sub: '珠江新城', lng: 113.330, lat: 23.130, weight: 5 },
  { city: '杭州', region: '上城区', sub: '钱江新城', lng: 120.205, lat: 30.245, weight: 4 },
  { city: '成都', region: '双流区', sub: '天府新区', lng: 104.062, lat: 30.580, weight: 3 },
];

const STRUCTURES: AssetAiFeatures['basic']['building_structure'][] = ['frame', 'brick', 'mixed'];
const RISK_POOL = ['产权瑕疵', '强电整改', '电梯老化', '消防升级', '噪音扰民', '管线老化', '渗水维修'];
const HIGHLIGHTS: Record<string, string[]> = {
  office: ['CBD 核心', '甲级写字楼', '5A 智能化', '近地铁', '联合办公'],
  retail: ['临街展示面', '客流密集', '社区商业'],
  hotel: ['连锁品牌', '商旅需求', '精装客房'],
  apartment: ['白领聚集', '通勤便利', '品牌公寓'],
  plant: ['独立院落', '电力充沛', '园区物业'],
  warehouse: ['高货架', '电梯月台', '24h 安保'],
};

// ===== utilities =====
function seedRand(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function ib(rand: () => number, lo: number, hi: number) {
  return Math.floor(rand() * (hi - lo + 1)) + lo;
}
function fb(rand: () => number, lo: number, hi: number, dec = 2) {
  return Number((rand() * (hi - lo) + lo).toFixed(dec));
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// 按权重抽 hotspot
function pickHotspot(rand: () => number) {
  const total = HOTSPOTS.reduce((s, h) => s + h.weight, 0);
  const r = rand() * total;
  let cum = 0;
  for (const h of HOTSPOTS) {
    cum += h.weight;
    if (r <= cum) return h;
  }
  return HOTSPOTS[0];
}

const TYPE_POOL: Array<[BusinessType, number, number]> = [
  ['office', 35, 6.5],
  ['retail', 20, 8.0],
  ['apartment', 15, 4.5],
  ['plant', 12, 1.4],
  ['warehouse', 10, 1.2],
  ['hotel', 8, 5.0],
];
function pickType(rand: () => number): [BusinessType, number] {
  const total = TYPE_POOL.reduce((s, t) => s + t[1], 0);
  const r = rand() * total;
  let cum = 0;
  for (const t of TYPE_POOL) {
    cum += t[1];
    if (r <= cum) return [t[0], t[2]];
  }
  return ['office', 6.5];
}

// ===== 资产生成器 =====
export function generateOneAsset(idx: number): Asset {
  const id = `RT-${String(idx).padStart(4, '0')}`;
  const rand = seedRand(hashStr(id));
  const hs = pickHotspot(rand);
  const [type, typeBase] = pickType(rand);

  const area =
    type === 'warehouse' || type === 'plant'
      ? ib(rand, 800, 22000)
      : type === 'hotel' || type === 'retail'
      ? ib(rand, 300, 9000)
      : type === 'apartment'
      ? ib(rand, 1500, 6000)
      : ib(rand, 800, 18000);

  const status: Asset['status'] =
    rand() < 0.42 ? 'leased' : rand() < 0.78 ? 'vacant' : 'renovating';

  const subway_distance =
    hs.sub.includes('地铁') || rand() < 0.6
      ? ib(rand, 100, 800)
      : ib(rand, 800, 4500);

  const condition_score = clamp(ib(rand, 2, 9) + (rand() < 0.3 ? -1 : 0), 1, 10);
  const last_renovation = condition_score >= 7 ? ib(rand, 2018, 2024) : ib(rand, 2005, 2019);

  const regionCoef = subway_distance < 500 ? 1.0 : subway_distance < 1500 ? 0.95 : 0.85;
  const condCoef = 1 + (condition_score - 5) * 0.02;
  const deco = pick(rand, ['rough', 'simple', 'standard', 'fine'] as const);
  const decoCoef = { rough: 0.78, simple: 0.88, standard: 1.0, fine: 1.18 }[deco];
  const estimated_price = Number(
    (typeBase * regionCoef * condCoef * decoCoef * (0.95 + rand() * 0.1)).toFixed(2)
  );

  const hidden_risks: HiddenRiskTag[] = [];
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

  const asset: Asset = {
    id,
    name: `${hs.sub}${type === 'office' ? '写字楼' : type === 'retail' ? '底商' : type === 'hotel' ? '酒店' : type === 'apartment' ? '公寓' : type === 'plant' ? '工业园' : '仓储'}-${idx}`,
    address: `${hs.city}市${hs.region}${hs.sub}核心区 ${ib(rand, 1, 200)} 号`,
    lnglat: [Number((hs.lng + (rand() - 0.5) * 0.012).toFixed(6)), Number((hs.lat + (rand() - 0.5) * 0.010).toFixed(6))],
    area,
    status,
    days_vacant,
    type,
    estimated_price,
    monthly_rent,
    occupancy_rate: status === 'leased' ? fb(rand, 0.7, 0.98) : 0,
    confidence: fb(rand, 0.5, 0.97),
    region: hs.region,
    received_batch: pick(rand, ['batch-1', 'batch-2', 'batch-3', 'batch-4']),
    certificate_status: rand() < 0.7 ? 'complete' : rand() < 0.9 ? 'pending' : 'missing',
    decoration_level: deco,
    last_renovation,
    default_free_rent_days: ib(rand, 0, 90),
    images: Array.from({ length: photoCount }, (_, i) => `photo-${id}-${i}`),
    hidden_risks,
    features: { subway_distance, condition_score },
  };

  // 复用基础 ai_features 生成器（保证字段对齐）
  asset.ai_features = baseAiFeatures(asset);
  // 简单修正 region 不在原 mock 中有的小问题
  if (asset.ai_features) {
    // 城市字段填充到 data_sources 不可少时
    (asset.ai_features as AssetAiFeatures).data_sources.survey_at = `2024-0${ib(rand, 1, 9)}-${String(ib(rand, 1, 28)).padStart(2, '0')}T14:30:00`;
  }
  return asset;
}

// ===== 竞品生成器 =====
const COMP_SOURCES = ['beike', '58', 'fangtianxia', 'lianjia'] as const;
export function generateOneCompetitor(idx: number): Competitor {
  const id = `C-${String(idx).padStart(4, '0')}`;
  const rand = seedRand(hashStr(id));
  const hs = pickHotspot(rand);
  const type: Competitor['type'] = pick(rand, TYPE_POOL)[0];
  const tierBase =
    hs.region.includes('东城') || hs.region.includes('西城') || hs.region.includes('朝阳') || hs.region.includes('海淀') || hs.region.includes('黄浦') || hs.region.includes('徐汇') || hs.region.includes('浦东') || hs.region.includes('静安')
      ? 8.5
      : hs.region.includes('通州') || hs.region.includes('丰台') || hs.region.includes('长宁') || hs.region.includes('杨浦')
      ? 4.5
      : 2;

  return {
    id,
    name: `${hs.sub}${pick(rand, ['·银座', '·大厦', '·中心', '', 'SOHO', '·汇', '·广场', ''])}${ib(rand, 1, 18)}号楼`,
    lnglat: [
      Number((hs.lng + (rand() - 0.5) * 0.015).toFixed(6)),
      Number((hs.lat + (rand() - 0.5) * 0.012).toFixed(6)),
    ],
    region: hs.region,
    type,
    list_price: Number((tierBase * fb(rand, 0.85, 1.25)).toFixed(2)),
    property_fee: ib(rand, 8, 32),
    occupancy_rate: fb(rand, 0.6, 0.95),
    source: pick(rand, [...COMP_SOURCES]),
    captured_at: '2026-07-2' + (ib(rand, 0, 4)),
    layout: `${ib(rand, 30, 200)}-${ib(rand, 80, 2500)}㎡`,
  };
}

// ===== batch API =====
let CACHED_ASSETS: Asset[] | null = null;
let CACHED_COMPS: Competitor[] | null = null;

export function generateAssets(n = 200): Asset[] {
  if (CACHED_ASSETS && CACHED_ASSETS.length === n) return CACHED_ASSETS;
  CACHED_ASSETS = Array.from({ length: n }, (_, i) => generateOneAsset(i + 1));
  return CACHED_ASSETS;
}

export function generateCompetitors(n = 300): Competitor[] {
  if (CACHED_COMPS && CACHED_COMPS.length === n) return CACHED_COMPS;
  CACHED_COMPS = Array.from({ length: n }, (_, i) => generateOneCompetitor(i + 1));
  return CACHED_COMPS;
}

export function clearMockCache() {
  CACHED_ASSETS = null;
  CACHED_COMPS = null;
}

// 高亮列举（仅用于 search demo）
export { HIGHLIGHTS, RISK_POOL };
