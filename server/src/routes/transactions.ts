import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * 历史成交记录
 * - GET    /api/transactions          列表（?asset_id=&source=&region=&start_date=&end_date=）
 * - GET    /api/transactions/:id      详情
 * - POST   /api/transactions          新增
 * - POST   /api/transactions/batch    批量新增
 * - DELETE /api/transactions/:id      删除
 */

router.get('/', (req, res) => {
  const db = getDb();
  const { asset_id, source, region, start_date, end_date } = req.query;
  let sql = 'SELECT * FROM transactions_history WHERE 1=1';
  const params: unknown[] = [];
  if (asset_id) { sql += ' AND asset_id = ?'; params.push(String(asset_id)); }
  if (source) { sql += ' AND source = ?'; params.push(String(source)); }
  if (region) { sql += ' AND region = ?'; params.push(String(region)); }
  if (start_date) { sql += ' AND deal_date >= ?'; params.push(String(start_date)); }
  if (end_date) { sql += ' AND deal_date <= ?'; params.push(String(end_date)); }
  sql += ' ORDER BY deal_date DESC LIMIT 1000';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM transactions_history WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '成交记录不存在' });
  res.json(row);
});

router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  if (!b.id || !b.source || !b.property_name || !b.deal_date || b.deal_price === undefined) {
    return res.status(400).json({ error: '缺少必填字段: id, source, property_name, deal_date, deal_price' });
  }
  try {
    db.prepare(`
      INSERT INTO transactions_history
        (id, asset_id, source, source_id, property_name, region, address, lng, lat, type,
         deal_date, deal_price, total_price, area_sqm, tenant,
         lease_term_months, free_rent_days, deposit_months, annual_increment_pct,
         deal_type, performance, notes, raw_json, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.id, b.asset_id || null, b.source, b.source_id || null, b.property_name,
      b.region || null, b.address || null, b.lng ?? null, b.lat ?? null, b.type || null,
      b.deal_date, b.deal_price, b.total_price ?? null, b.area_sqm ?? null, b.tenant || null,
      b.lease_term_months ?? null, b.free_rent_days ?? null, b.deposit_months ?? null,
      b.annual_increment_pct ?? null, b.deal_type || null, b.performance || null,
      b.notes || null, b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
    );
    res.status(201).json({ id: b.id, message: '成交记录已入库' });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: '重复数据（source+source_id 已存在）' });
    }
    throw e;
  }
});

router.post('/batch', (req, res) => {
  const db = getDb();
  const list: unknown[] = Array.isArray(req.body) ? req.body : req.body.items;
  if (!Array.isArray(list)) return res.status(400).json({ error: '需传入数组或 { items: [] }' });
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO transactions_history
      (id, asset_id, source, source_id, property_name, region, address, lng, lat, type,
       deal_date, deal_price, total_price, area_sqm, tenant,
       lease_term_months, free_rent_days, deposit_months, annual_increment_pct,
       deal_type, performance, notes, raw_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items: unknown[]) => {
    let saved = 0;
    for (const item of items) {
      const b = item as Record<string, unknown>;
      const r = stmt.run(
        b.id, b.asset_id || null, b.source, b.source_id || null, b.property_name,
        b.region || null, b.address || null, b.lng ?? null, b.lat ?? null, b.type || null,
        b.deal_date, b.deal_price, b.total_price ?? null, b.area_sqm ?? null, b.tenant || null,
        b.lease_term_months ?? null, b.free_rent_days ?? null, b.deposit_months ?? null,
        b.annual_increment_pct ?? null, b.deal_type || null, b.performance || null,
        b.notes || null, b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
      );
      if (r.changes > 0) saved++;
    }
    return saved;
  });
  const saved = tx(list);
  res.status(201).json({ total: list.length, saved, skipped: list.length - saved });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM transactions_history WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '成交记录不存在' });
  res.json({ message: '成交记录已删除' });
});

export default router;
