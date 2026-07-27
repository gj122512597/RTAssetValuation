import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * 政府公开数据
 * - GET    /api/government          列表（?source=&data_type=&region=&start_date=&end_date=）
 * - GET    /api/government/:id      详情
 * - POST   /api/government          新增
 * - POST   /api/government/batch    批量新增
 * - DELETE /api/government/:id      删除
 */

router.get('/', (req, res) => {
  const db = getDb();
  const { source, data_type, region, start_date, end_date } = req.query;
  let sql = 'SELECT * FROM government_data WHERE 1=1';
  const params: unknown[] = [];
  if (source) { sql += ' AND source = ?'; params.push(String(source)); }
  if (data_type) { sql += ' AND data_type = ?'; params.push(String(data_type)); }
  if (region) { sql += ' AND region = ?'; params.push(String(region)); }
  if (start_date) { sql += ' AND publish_date >= ?'; params.push(String(start_date)); }
  if (end_date) { sql += ' AND publish_date <= ?'; params.push(String(end_date)); }
  sql += ' ORDER BY publish_date DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM government_data WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '政府数据不存在' });
  res.json(row);
});

router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  if (!b.id || !b.source || !b.data_type || !b.title || !b.captured_at) {
    return res.status(400).json({ error: '缺少必填字段: id, source, data_type, title, captured_at' });
  }
  try {
    db.prepare(`
      INSERT INTO government_data
        (id, source, source_id, data_type, title, region, publish_date, effective_date,
         content, doc_url, related_asset_ids, raw_json, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.id, b.source, b.source_id || null, b.data_type, b.title, b.region || null,
      b.publish_date || null, b.effective_date || null, b.content || null,
      b.doc_url || null,
      b.related_asset_ids ? JSON.stringify(b.related_asset_ids) : null,
      b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
    );
    res.status(201).json({ id: b.id, message: '政府数据已入库' });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: '重复数据' });
    }
    throw e;
  }
});

router.post('/batch', (req, res) => {
  const db = getDb();
  const list: unknown[] = Array.isArray(req.body) ? req.body : req.body.items;
  if (!Array.isArray(list)) return res.status(400).json({ error: '需传入数组或 { items: [] }' });
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO government_data
      (id, source, source_id, data_type, title, region, publish_date, effective_date,
       content, doc_url, related_asset_ids, raw_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items: unknown[]) => {
    let saved = 0;
    for (const item of items) {
      const b = item as Record<string, unknown>;
      const r = stmt.run(
        b.id, b.source, b.source_id || null, b.data_type, b.title, b.region || null,
        b.publish_date || null, b.effective_date || null, b.content || null,
        b.doc_url || null,
        b.related_asset_ids ? JSON.stringify(b.related_asset_ids) : null,
        b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
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
  const result = db.prepare('DELETE FROM government_data WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '政府数据不存在' });
  res.json({ message: '政府数据已删除' });
});

export default router;
