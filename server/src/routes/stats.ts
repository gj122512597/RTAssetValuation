import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * 数据统计（仪表盘用）
 * - GET /api/stats  各表记录数汇总 + 各数据源爬取量
 * - GET /api/stats/source-distribution  按数据源分布
 */

router.get('/', (_req, res) => {
  const db = getDb();
  const counts = {
    assets: (db.prepare('SELECT COUNT(*) AS c FROM assets').get() as { c: number }).c,
    competitors: (db.prepare('SELECT COUNT(*) AS c FROM competitor_listings').get() as { c: number }).c,
    transactions: (db.prepare('SELECT COUNT(*) AS c FROM transactions_history').get() as { c: number }).c,
    poi: (db.prepare('SELECT COUNT(*) AS c FROM poi_data').get() as { c: number }).c,
    government: (db.prepare('SELECT COUNT(*) AS c FROM government_data').get() as { c: number }).c,
    crawl_tasks: (db.prepare('SELECT COUNT(*) AS c FROM crawl_tasks').get() as { c: number }).c,
    crawl_logs: (db.prepare('SELECT COUNT(*) AS c FROM crawl_logs').get() as { c: number }).c,
    data_sources: (db.prepare('SELECT COUNT(*) AS c FROM data_sources').get() as { c: number }).c,
  };
  res.json(counts);
});

router.get('/source-distribution', (_req, res) => {
  const db = getDb();
  const competitors = db.prepare(
    'SELECT source, COUNT(*) AS count FROM competitor_listings GROUP BY source ORDER BY count DESC'
  ).all();
  const transactions = db.prepare(
    'SELECT source, COUNT(*) AS count FROM transactions_history GROUP BY source ORDER BY count DESC'
  ).all();
  const poi = db.prepare(
    'SELECT category AS source, COUNT(*) AS count FROM poi_data GROUP BY category ORDER BY count DESC'
  ).all();
  const government = db.prepare(
    'SELECT data_type AS source, COUNT(*) AS count FROM government_data GROUP BY data_type ORDER BY count DESC'
  ).all();
  res.json({ competitors, transactions, poi, government });
});

export default router;
