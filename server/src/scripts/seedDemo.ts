/**
 * 种子数据脚本（演示用）
 * 运行：cd server && npm run db:seed
 *
 * 写入少量示例数据，验证表结构和 API 可用性。
 * 生产环境请勿运行。
 */
import { getDb, initSchema, closeDb } from '../db.js';

function rid(prefix: string, i: number): string {
  return `${prefix}-${String(i).padStart(4, '0')}`;
}

function seed(): void {
  initSchema();
  const db = getDb();
  const now = new Date().toISOString();

  // 1. 数据源
  const sources = [
    { id: 'src-beike', name: '贝壳', source_type: 'crawler', base_url: 'https://bj.ke.com', rate_limit_per_min: 30 },
    { id: 'src-58', name: '58同城', source_type: 'crawler', base_url: 'https://bj.58.com', rate_limit_per_min: 30 },
    { id: 'src-fangtianxia', name: '房天下', source_type: 'crawler', base_url: 'https://office.fang.com', rate_limit_per_min: 20 },
    { id: 'src-lianjia', name: '链家', source_type: 'crawler', base_url: 'https://bj.lianjia.com', rate_limit_per_min: 30 },
    { id: 'src-amap', name: '高德POI', source_type: 'api', base_url: 'https://restapi.amap.com/v3/place/around', rate_limit_per_min: 200 },
    { id: 'src-gov-bj', name: '北京市规自委', source_type: 'crawler', base_url: 'https://ghzrzyw.beijing.gov.cn', rate_limit_per_min: 10 },
  ];
  const stmtSrc = db.prepare(`
    INSERT OR IGNORE INTO data_sources (id, name, source_type, base_url, rate_limit_per_min, enabled)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  for (const s of sources) stmtSrc.run(s.id, s.name, s.source_type, s.base_url, s.rate_limit_per_min);

  // 2. 爬虫任务
  const tasks = [
    { id: 'task-001', name: '北京-朝阳-写字楼竞品', source: 'beike', task_type: 'competitor', region: '北京/朝阳', schedule_cron: '0 8 * * *' },
    { id: 'task-002', name: '北京-海淀-写字楼竞品', source: 'lianjia', task_type: 'competitor', region: '北京/海淀', schedule_cron: '0 8 * * *' },
    { id: 'task-003', name: '上海-浦东-商铺成交', source: 'beike', task_type: 'transaction', region: '上海/浦东', schedule_cron: '0 9 * * *' },
    { id: 'task-004', name: '北京-国贸周边POI', source: 'amap', task_type: 'poi', region: '北京/朝阳', schedule_cron: '0 2 * * 0' },
    { id: 'task-005', name: '北京-土地出让公告', source: 'gov-bj', task_type: 'government', region: '北京', schedule_cron: '0 6 * * *' },
    { id: 'task-006', name: '上海-规划公示', source: 'gov-bj', task_type: 'government', region: '上海', schedule_cron: '0 6 * * *' },
  ];
  const stmtTask = db.prepare(`
    INSERT OR IGNORE INTO crawl_tasks (id, name, source, task_type, region, schedule_cron, status)
    VALUES (?, ?, ?, ?, ?, ?, 'paused')
  `);
  for (const t of tasks) stmtTask.run(t.id, t.name, t.source, t.task_type, t.region, t.schedule_cron);

  // 3. 竞品样例（北京国贸周边）
  const competitors = [
    { id: rid('comp', 1), source: 'beike', source_id: 'BJ-001', name: '国贸大厦', region: '北京/朝阳', lng: 116.4648, lat: 39.9087, type: 'office', list_price: 12.5, property_fee: 32, occupancy_rate: 0.95 },
    { id: rid('comp', 2), source: 'lianjia', source_id: 'LJ-001', name: '银泰中心', region: '北京/朝阳', lng: 116.4665, lat: 39.9065, type: 'office', list_price: 11.8, property_fee: 30, occupancy_rate: 0.92 },
    { id: rid('comp', 3), source: '58', source_id: '58-001', name: '财富中心', region: '北京/朝阳', lng: 116.4612, lat: 39.9123, type: 'office', list_price: 10.5, property_fee: 28, occupancy_rate: 0.88 },
    { id: rid('comp', 4), source: 'fangtianxia', source_id: 'FT-001', name: '嘉里中心', region: '北京/朝阳', lng: 116.4598, lat: 39.9098, type: 'office', list_price: 13.2, property_fee: 35, occupancy_rate: 0.96 },
  ];
  const stmtComp = db.prepare(`
    INSERT OR IGNORE INTO competitor_listings
      (id, source, source_id, name, region, lng, lat, type, list_price, property_fee, occupancy_rate, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of competitors) stmtComp.run(c.id, c.source, c.source_id, c.name, c.region, c.lng, c.lat, c.type, c.list_price, c.property_fee, c.occupancy_rate, now);

  // 4. 成交记录样例
  const txs = [
    { id: rid('tx', 1), source: 'beike', source_id: 'T-001', property_name: '国贸大厦A座', region: '北京/朝阳', lng: 116.4648, lat: 39.9087, type: 'office', deal_date: '2024-03-15', deal_price: 12.0, tenant: '某科技公司', lease_term_months: 36, free_rent_days: 30, deposit_months: 3, annual_increment_pct: 5, deal_type: 'new', performance: 'good' },
    { id: rid('tx', 2), source: 'lianjia', source_id: 'T-002', property_name: '银泰中心B座', region: '北京/朝阳', lng: 116.4665, lat: 39.9065, type: 'office', deal_date: '2024-06-20', deal_price: 11.5, tenant: '某金融公司', lease_term_months: 24, free_rent_days: 15, deposit_months: 2, annual_increment_pct: 4, deal_type: 'renewal', performance: 'good' },
    { id: rid('tx', 3), source: 'beike', source_id: 'T-003', property_name: '财富中心C座', region: '北京/朝阳', lng: 116.4612, lat: 39.9123, type: 'office', deal_date: '2023-11-10', deal_price: 10.2, tenant: '某咨询公司', lease_term_months: 36, free_rent_days: 45, deposit_months: 3, annual_increment_pct: 5, deal_type: 'new', performance: 'early_exit' },
  ];
  const stmtTx = db.prepare(`
    INSERT OR IGNORE INTO transactions_history
      (id, source, source_id, property_name, region, lng, lat, type, deal_date, deal_price,
       tenant, lease_term_months, free_rent_days, deposit_months, annual_increment_pct, deal_type, performance, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of txs) stmtTx.run(t.id, t.source, t.source_id, t.property_name, t.region, t.lng, t.lat, t.type, t.deal_date, t.deal_price, t.tenant, t.lease_term_months, t.free_rent_days, t.deposit_months, t.annual_increment_pct, t.deal_type, t.performance, now);

  // 5. POI 样例
  const pois = [
    { id: rid('poi', 1), name: '国贸地铁站', category: 'metro', sub_type: '地铁站', lng: 116.4648, lat: 39.9087, region: '北京/朝阳' },
    { id: rid('poi', 2), name: '国贸商城', category: 'shopping', sub_type: '购物中心', lng: 116.4635, lat: 39.9090, region: '北京/朝阳' },
    { id: rid('poi', 3), name: '朝阳医院', category: 'hospital', sub_type: '三甲医院', lng: 116.4521, lat: 39.9215, region: '北京/朝阳' },
    { id: rid('poi', 4), name: '朝阳实验小学', category: 'school', sub_type: '小学', lng: 116.4701, lat: 39.9150, region: '北京/朝阳' },
  ];
  const stmtPoi = db.prepare(`
    INSERT OR IGNORE INTO poi_data
      (id, source, name, category, sub_type, region, lng, lat, captured_at)
    VALUES (?, 'amap', ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of pois) stmtPoi.run(p.id, p.name, p.category, p.sub_type, p.region, p.lng, p.lat, now);

  // 6. 政府数据样例
  const govs = [
    { id: rid('gov', 1), source: 'gov-bj', source_id: 'G-001', data_type: 'land_auction', title: '朝阳区CBD核心区地块出让公告', region: '北京/朝阳', publish_date: '2024-05-10', content: '出让面积 2.5 万㎡，用途为商业办公', doc_url: 'https://example.com/notice/001' },
    { id: rid('gov', 2), source: 'gov-bj', source_id: 'G-002', data_type: 'planning', title: '朝阳区国土空间规划(2021-2035)', region: '北京/朝阳', publish_date: '2023-12-01', effective_date: '2024-01-01', content: '明确CBD东扩方案，新增商业用地', doc_url: 'https://example.com/plan/002' },
  ];
  const stmtGov = db.prepare(`
    INSERT OR IGNORE INTO government_data
      (id, source, source_id, data_type, title, region, publish_date, effective_date, content, doc_url, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of govs) stmtGov.run(g.id, g.source, g.source_id, g.data_type, g.title, g.region, g.publish_date, g.effective_date || null, g.content, g.doc_url, now);

  // 统计
  const counts = {
    data_sources: (db.prepare('SELECT COUNT(*) AS c FROM data_sources').get() as { c: number }).c,
    crawl_tasks: (db.prepare('SELECT COUNT(*) AS c FROM crawl_tasks').get() as { c: number }).c,
    competitors: (db.prepare('SELECT COUNT(*) AS c FROM competitor_listings').get() as { c: number }).c,
    transactions: (db.prepare('SELECT COUNT(*) AS c FROM transactions_history').get() as { c: number }).c,
    poi: (db.prepare('SELECT COUNT(*) AS c FROM poi_data').get() as { c: number }).c,
    government: (db.prepare('SELECT COUNT(*) AS c FROM government_data').get() as { c: number }).c,
  };
  console.log('[seed] 种子数据写入完成:', counts);
}

seed();
closeDb();
