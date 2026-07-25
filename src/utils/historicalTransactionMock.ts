/**
 * 历史成交记录 Mock 生成器（专业视角）
 *
 * 设计原则：
 *  - 按业态特征生成不同租期（写字楼/酒店长租，商铺/公寓短租）
 *  - 价格走势反映：宏观 CPI + 区位溢价 + 装修升级
 *  - 真实公司名（mock 但形似真实）
 *  - 时间从 2019-01 至 2026-07，覆盖 7 年
 *  - 业绩字段反映风险（leased 多 good，vacant 多 overdue/handover）
 */
import type { Asset, AssetAiFeatures, Transaction } from '@/types';

const TENANTS_BY_TYPE: Record<string, string[]> = {
  office: [
    '北京银信会计师事务所', '中国机械工程研究院', '中科智远咨询集团',
    '联想（北京）有限公司', '北辰实业集团', '国信证券股份有限公司',
    '中信建投证券', '光大银行北京分行', '海航集团', '北京字节跳动',
    '中国民生银行', '京东集团', '新浪科技', '美团点评',
    '中影集团', '神州数码', '东软集团', '京东方科技集团',
  ],
  retail: [
    '瑞幸咖啡', '星巴克咖啡', '海底捞餐饮', '西贝餐饮集团',
    '屈臣氏个人商店', '麦当劳中国', '必胜客', '苹果授权零售店',
    '优衣库', '李宁（中国）', '盒马鲜生', '永辉超市',
    '7-11便利店', '肯德基', '老乡鸡', '书亦烧仙草',
  ],
  hotel: [
    '锦江酒店（北京）', '华住酒店集团', '首旅如家集团',
    '洲际酒店集团', '万豪国际', '雅高集团', '凯悦酒店',
    '格林酒店集团', '亚朵酒店集团', '尚客优酒店',
  ],
  apartment: [
    '链家自如公寓', '魔方公寓', '建信住房服务', '蛋壳公寓',
    '万科泊寓', '华润有巢', '旭辉瓴寓', '中海友里',
    '招商伊敦公寓', '龙湖冠寓',
  ],
  warehouse: [
    '京东物流', '顺丰速运', '中通快递', '圆通速递',
    '申通快递', '德邦物流', '中国邮政速递',
    '安能物流', '百世快递', '韵达速递',
  ],
  plant: [
    '比亚迪汽车工业', '富士康精密工业', '美的集团',
    '格力电器', '海尔智家', '北汽集团',
    '三一重工', '徐工集团', '宁德时代新能源',
  ],
};

const NOTES_POOL: string[] = [
  '中标国资委协议',
  '续约谈判 3 个月敲定',
  '招商局引荐客户',
  '公开招租 17 家竞标',
  '总部推荐大客户',
  '部队内部周转',
  '资产接收初期免租优惠',
  '产业园区战略合作',
  '商务谈判周期较长',
  '续约阶段谈判顺利',
];

interface TypeLeaseConfig {
  baseTermMonths: number;
  termJitterMonths: number;
  baseFreeRentDays: number;
  freeRentRatio: number; // 免租期占租期的比例
  depositMonths: number;
  baseAnnualIncrement: number; // %
}

const TYPE_LEASE_CONFIG: Record<string, TypeLeaseConfig> = {
  office: {
    baseTermMonths: 36,
    termJitterMonths: 12,
    baseFreeRentDays: 30,
    freeRentRatio: 0.03,
    depositMonths: 3,
    baseAnnualIncrement: 3.5,
  },
  retail: {
    baseTermMonths: 18,
    termJitterMonths: 12,
    baseFreeRentDays: 30,
    freeRentRatio: 0.05,
    depositMonths: 2,
    baseAnnualIncrement: 4.0,
  },
  hotel: {
    baseTermMonths: 60,
    termJitterMonths: 24,
    baseFreeRentDays: 60,
    freeRentRatio: 0.04,
    depositMonths: 3,
    baseAnnualIncrement: 3.0,
  },
  apartment: {
    baseTermMonths: 12,
    termJitterMonths: 6,
    baseFreeRentDays: 7,
    freeRentRatio: 0.02,
    depositMonths: 1,
    baseAnnualIncrement: 5.0,
  },
  warehouse: {
    baseTermMonths: 36,
    termJitterMonths: 12,
    baseFreeRentDays: 45,
    freeRentRatio: 0.04,
    depositMonths: 2,
    baseAnnualIncrement: 2.5,
  },
  plant: {
    baseTermMonths: 60,
    termJitterMonths: 24,
    baseFreeRentDays: 90,
    freeRentRatio: 0.06,
    depositMonths: 3,
    baseAnnualIncrement: 2.0,
  },
};

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

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

interface RangeYear {
  startYear: number;
  endYear: number;
}

/**
 * 根据当前时间和资产状态决定历史成交时间窗：
 *  - 2019-01 ~ 2026-07 完整窗口
 *  - leased 资产：3-7 笔历史成交
 *  - vacant 资产：2-4 笔历史成交 + 最后一次成交在 days_vacant 之前
 *  - renovating 资产：2-5 笔历史成交 + 最后一次在装修前
 */
function generateHistoryFor(
  asset: Asset,
  ai?: AssetAiFeatures
): Transaction[] {
  const seed = hashStr(asset.id + '_history');
  const rand = seedRand(seed);

  const start = new Date('2019-01-01');
  const end = new Date('2026-07-01');

  // 决定历史笔数
  let count: number;
  if (asset.status === 'leased') count = Math.floor(rand() * 5) + 3; // 3-7
  else if (asset.status === 'renovating') count = Math.floor(rand() * 4) + 2; // 2-5
  else count = Math.floor(rand() * 3) + 2; // 2-4（vacant 资产历史少）

  // 类型决定基础租期配置
  const cfg = TYPE_LEASE_CONFIG[asset.type] ?? TYPE_LEASE_CONFIG.office;
  const tenants = TENANTS_BY_TYPE[asset.type] ?? TENANTS_BY_TYPE.office;

  // 起始价格（最旧的成交价 = 当前 estimated × 历史折扣）
  // 一般 5-8 年前的价格是当前的 70%~85%
  let basePrice = asset.estimated_price * (0.7 + rand() * 0.15);

  const out: Transaction[] = [];
  const totalSpanMs = end.getTime() - start.getTime();
  const intervalMs = totalSpanMs / count;

  // 当前时间游标
  let cursorMs = start.getTime();

  // 性能分布：leased 多 good，vacant/renovating 多 overdue
  const perfFor = (): Transaction['performance'] => {
    const r = rand();
    if (asset.status === 'leased') return r < 0.78 ? 'good' : r < 0.92 ? 'early_exit' : 'overdue';
    if (asset.status === 'renovating') return r < 0.6 ? 'good' : r < 0.85 ? 'early_exit' : 'overdue';
    return r < 0.5 ? 'good' : r < 0.8 ? 'early_exit' : 'overdue';
  };

  for (let i = 0; i < count; i++) {
    // 在当前游标附近随机抖动（±30% intervalMs）
    const jitter = (rand() - 0.5) * 0.6 * intervalMs;
    const txDate = new Date(cursorMs + jitter);

    // 价格年增（CPI + 业态溢价 + 装修升级随机）
    const yearGap = (i - count + 1) * -1; // 早期 i 小 → 正年
    const annualRise = cfg.baseAnnualIncrement + (rand() - 0.5) * 2.5;
    basePrice = basePrice * (1 + annualRise / 100);

    // 大年价格波动（如疫情 2020 租金降 5-15%，2022 反弹 +10%）
    const year = txDate.getFullYear();
    if (year === 2020 && asset.type !== 'warehouse') basePrice *= 0.92; // 疫情
    if (year === 2022) basePrice *= 1.06; // 反弹

    // 特殊：station 类物业 +5%（北京西站/上海虹桥附近）
    if (asset.features.subway_distance < 200) basePrice *= 1.05;

    const price = Number(basePrice.toFixed(2));

    // 租期
    const termMonths = Math.max(6, cfg.baseTermMonths + Math.floor((rand() - 0.5) * cfg.termJitterMonths));
    // 免租期：按租期比例 + 装修情况
    const freeRent = Math.round(cfg.baseFreeRentDays + cfg.freeRentRatio * termMonths * 30 + (rand() - 0.5) * 14);
    // 押金
    const depositMonths = Math.max(1, cfg.depositMonths + Math.floor((rand() - 0.5) * 1));
    // 年递增
    const increment = Number(
      Math.max(0, cfg.baseAnnualIncrement + (rand() - 0.5) * 2).toFixed(1)
    );

    // 状态：第 0 笔为 handover（资产接收时），后续是 new / renewal
    let status: Transaction['status'] = 'handover';
    if (i > 0) status = i % 3 === 0 ? 'renewal' : 'new';

    const perf = perfFor();

    // 备注（仅 occasional 添加）
    const notes =
      rand() < 0.2
        ? rand() < 0.5
          ? pick(rand, NOTES_POOL)
          : perf === 'overdue'
          ? '客户出现资金压力，已启动协商'
          : perf === 'early_exit'
          ? '租客提前 3 个月退租，已接手新客户'
          : '履约良好，按时付款'
        : undefined;

    out.push({
      id: `TX-${asset.id}-${String(i).padStart(3, '0')}`,
      date: fmtDate(txDate),
      price_per_m2: price,
      tenant: pick(rand, tenants),
      type: asset.type,
      lease_term_months: termMonths,
      free_rent_days: freeRent,
      deposit_months: depositMonths,
      annual_increment_pct: increment,
      status,
      performance: perf,
      notes,
    });

    // 下一笔间隔 = 上一笔租期 + 可能的空置期
    const vacantGapMonths = perf === 'early_exit' ? 1 + Math.floor(rand() * 3) : perf === 'overdue' ? 0 : 0;
    cursorMs = addMonths(txDate, termMonths + vacantGapMonths).getTime();
  }

  // 特殊处理：leased 资产的最后一笔交易应该是接近当前 estimated_price
  // （处理空置天数：如果 leased 则最后一笔的 date + lease_term 应在最近 days_vacant 内开始）
  if (out.length > 0 && asset.status === 'leased') {
    const last = out[out.length - 1];
    // 让最后一笔的价格接近 estimated_price
    last.price_per_m2 = Number(asset.estimated_price.toFixed(2));
  }

  return out;
}

/**
 * 顶层 API：给 asset 注入历史成交数据
 *  - 不修改原 asset，返回一个新对象（保持 React 不可变性）
 */
export function injectHistoricalTransactions(asset: Asset): Asset {
  if (asset.historical_transactions && asset.historical_transactions.length > 0) {
    return asset; // 已有，不覆盖
  }
  return {
    ...asset,
    historical_transactions: generateHistoryFor(asset, asset.ai_features),
  };
}