/**
 * 将 Hedonic 模型训练的 10 条样本写入数据库 assets 表
 * - 数据来源：用户上传的《青岛商业办公_HedonicMVP_数据宽表.xlsx》中「办公用房出租」的 10 条样本
 * - 目的：让这 10 条训练样本也能在地图 / 资产详情中查看（与前端 mock 资产平级）
 * - 缺失字段直接在相关表中 mock：
 *   · features_json：{ subway_distance, condition_score }（来自样本特征）
 *   · hidden_risks：根据样本特征推导的合法 HiddenRiskTag（见 deriveRisks）
 *   · ai_features / historical_transactions：前端 loadAll 时用 generateAiFeatures / injectHistoricalTransactions 补齐（与现有 225 资产一致）
 *
 * 运行：npm run server:db:migrate:training
 * 幂等：id 已存在则 UPDATE，不会重复写入。
 */
import { getDb, initSchema } from '../db.js';

interface Sample {
  seq: number;
  name: string;
  district: string;
  circle: string;
  lng: number;
  lat: number;
  area: number;
  /** 真实月单位租金（元/㎡·月） */
  monthlyRent: number;
  subwayDistance: number;
  conditionScore: number;
  decorationIdx: number;
  isCbd: number;
  decoAge: number;
}

// 与 src/data/hedonicTrainingData.ts 的 TRAINING_SAMPLES 一一对应（顺序一致）
const SAMPLES: Sample[] = [
  { seq: 1, name: '中海大厦', district: '市北区', circle: '核心商圈', lng: 120.3684036, lat: 36.0870737, area: 500, monthlyRent: 85.2, subwayDistance: 690, conditionScore: 5.62, decorationIdx: 1, isCbd: 1, decoAge: 14.5 },
  { seq: 2, name: '新澳国际', district: '李沧区', circle: '次核心商圈', lng: 120.4277878, lat: 36.1606941, area: 860, monthlyRent: 57.8, subwayDistance: 9326, conditionScore: 4.62, decorationIdx: 1, isCbd: 0, decoAge: 14.5 },
  { seq: 3, name: '万邦中心', district: '市南区', circle: '核心商圈', lng: 120.369065, lat: 36.0605333, area: 2087, monthlyRent: 59.99, subwayDistance: 1397, conditionScore: 4.62, decorationIdx: 1, isCbd: 1, decoAge: 14.5 },
  { seq: 4, name: '卓越·世纪中心', district: '市北区', circle: '核心商圈', lng: 120.376893, lat: 36.0879018, area: 500, monthlyRent: 75.0, subwayDistance: 81, conditionScore: 5.62, decorationIdx: 1, isCbd: 1, decoAge: 14.5 },
  { seq: 5, name: '金孚大厦', district: '市南区', circle: '核心商圈', lng: 120.3709793, lat: 36.077095, area: 179, monthlyRent: 42.0, subwayDistance: 1294, conditionScore: 5.07, decorationIdx: 1, isCbd: 1, decoAge: 10.0 },
  { seq: 6, name: 'SIIC上实中心', district: '崂山区', circle: '核心商圈', lng: 120.4603102, lat: 36.0968151, area: 210, monthlyRent: 90.0, subwayDistance: 4467, conditionScore: 7.08, decorationIdx: 3, isCbd: 1, decoAge: 14.5 },
  { seq: 7, name: '华普大厦', district: '市南区', circle: '核心商圈', lng: 120.3898107, lat: 36.0646724, area: 150, monthlyRent: 55.55, subwayDistance: 528, conditionScore: 3.77, decorationIdx: 1, isCbd: 1, decoAge: 23.0 },
  { seq: 8, name: '华仁国际大厦', district: '市南区', circle: '核心商圈', lng: 120.3764371, lat: 36.062407, area: 230, monthlyRent: 106.89, subwayDistance: 702, conditionScore: 5.62, decorationIdx: 1, isCbd: 1, decoAge: 14.5 },
  { seq: 9, name: '银盛泰国际商务港', district: '城阳区', circle: '次核心商圈', lng: 120.3939285, lat: 36.3044014, area: 240, monthlyRent: 47.08, subwayDistance: 9114, conditionScore: 7.08, decorationIdx: 3, isCbd: 0, decoAge: 14.5 },
  { seq: 10, name: '世纪大厦', district: '市南区', circle: '核心商圈', lng: 120.3842029, lat: 36.0632535, area: 1500, monthlyRent: 75.0, subwayDistance: 85, conditionScore: 5.17, decorationIdx: 1, isCbd: 1, decoAge: 19.0 },
];

const DECORATION_LEVEL: Record<number, string> = {
  0: 'rough',
  1: 'standard',
  2: 'fine',
  3: 'luxury',
};

/** 根据样本特征推导合法的 HiddenRiskTag（禁止任意字符串，否则详情页 RISK_LABELS 会崩溃） */
function deriveRisks(s: Sample): string[] {
  const risks = new Set<string>();
  if (s.decoAge > 15 || s.conditionScore < 5) risks.add('fire_safety'); // 楼龄偏大 / 条件差 → 消防不达标风险
  if (s.isCbd === 0) risks.add('covenant_limit'); // 非核心商圈 → 业主/业态限制、去化周期长
  risks.add('mortgage'); // 典型 CRE 资产多处于抵押状态（常见 mock）
  return [...risks];
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

const db = getDb();
initSchema(); // 幂等建表（CREATE IF NOT EXISTS）

const upsert = db.prepare(`
  INSERT INTO assets
    (id, name, address, lng, lat, area, status, days_vacant, type,
     estimated_price, monthly_rent, occupancy_rate, confidence, region,
     received_batch, certificate_status, decoration_level, last_renovation,
     default_free_rent_days, hidden_risks, features_json, ai_features_json)
  VALUES (@id, @name, @address, @lng, @lat, @area, @status, @days_vacant, @type,
     @estimated_price, @monthly_rent, @occupancy_rate, @confidence, @region,
     @received_batch, @certificate_status, @decoration_level, @last_renovation,
     @default_free_rent_days, @hidden_risks, @features_json, @ai_features_json)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, address=excluded.address, lng=excluded.lng, lat=excluded.lat,
    area=excluded.area, status=excluded.status, days_vacant=excluded.days_vacant,
    type=excluded.type, estimated_price=excluded.estimated_price, monthly_rent=excluded.monthly_rent,
    occupancy_rate=excluded.occupancy_rate, confidence=excluded.confidence, region=excluded.region,
    received_batch=excluded.received_batch, certificate_status=excluded.certificate_status,
    decoration_level=excluded.decoration_level, last_renovation=excluded.last_renovation,
    default_free_rent_days=excluded.default_free_rent_days, hidden_risks=excluded.hidden_risks,
    features_json=excluded.features_json, ai_features_json=excluded.ai_features_json,
    updated_at=datetime('now')
`);

let saved = 0;
for (const s of SAMPLES) {
  const id = `HT-${String(s.seq).padStart(3, '0')}`;
  upsert.run({
    id,
    name: s.name,
    address: `${s.district}${s.circle}`, // 原表无街道地址，用「行政区+商圈」mock
    lng: s.lng,
    lat: s.lat,
    area: s.area,
    status: 'leased',
    days_vacant: 0,
    type: 'office',
    estimated_price: round(s.monthlyRent, 2), // 元/㎡·月（与现有 mock 估值量级一致）
    monthly_rent: round(s.monthlyRent / 30, 4), // 元/㎡·天
    occupancy_rate: 0.92,
    confidence: 0.72,
    region: s.district,
    received_batch: 'hedonic_training',
    certificate_status: 'complete',
    decoration_level: DECORATION_LEVEL[s.decorationIdx] ?? 'standard',
    last_renovation: 2023,
    default_free_rent_days: 30,
    hidden_risks: JSON.stringify(deriveRisks(s)),
    features_json: JSON.stringify({ subway_distance: s.subwayDistance, condition_score: s.conditionScore }),
    ai_features_json: null, // 前端 loadAll 用 generateAiFeatures 补齐
  });
  saved++;
}

console.log(`[migrateTrainingAssets] 已写入 ${saved} 条训练样本资产（received_batch=hedonic_training，id=HT-001..HT-010）`);
process.exit(0);
