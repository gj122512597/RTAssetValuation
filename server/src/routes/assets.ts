import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * 资产主表（与前端 mock 对齐）
 * - GET    /api/assets          列表（?region=&type=&status=）
 * - GET    /api/assets/:id      详情
 * - POST   /api/assets          新增
 * - PUT    /api/assets/:id      更新
 * - DELETE /api/assets/:id      删除
 */

router.get('/', (req, res) => {
  const db = getDb();
  const { region, type, status, received_batch } = req.query;
  let sql = 'SELECT * FROM assets WHERE 1=1';
  const params: unknown[] = [];
  if (region) { sql += ' AND region = ?'; params.push(String(region)); }
  if (type) { sql += ' AND type = ?'; params.push(String(type)); }
  if (status) { sql += ' AND status = ?'; params.push(String(status)); }
  if (received_batch) { sql += ' AND received_batch = ?'; params.push(String(received_batch)); }
  sql += ' ORDER BY updated_at DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id) as
    | Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: '资产不存在' });
  for (const f of ['hidden_risks', 'features_json', 'ai_features_json']) {
    if (row[f] && typeof row[f] === 'string') {
      try { row[f] = JSON.parse(row[f] as string); } catch { /* 保留原值 */ }
    }
  }
  res.json(row);
});

router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  if (!b.id || !b.name) {
    return res.status(400).json({ error: '缺少必填字段: id, name' });
  }
  db.prepare(`
    INSERT INTO assets
      (id, name, address, lng, lat, area, status, days_vacant, type,
       estimated_price, monthly_rent, occupancy_rate, confidence, region,
       received_batch, certificate_status, decoration_level, last_renovation,
       default_free_rent_days, hidden_risks, features_json, ai_features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.id, b.name, b.address || null, b.lng ?? null, b.lat ?? null, b.area ?? null,
    b.status || null, b.days_vacant ?? null, b.type || null,
    b.estimated_price ?? null, b.monthly_rent ?? null, b.occupancy_rate ?? null,
    b.confidence ?? null, b.region || null, b.received_batch || null,
    b.certificate_status || null, b.decoration_level || null, b.last_renovation ?? null,
    b.default_free_rent_days ?? null,
    b.hidden_risks ? JSON.stringify(b.hidden_risks) : null,
    b.features ? JSON.stringify(b.features) : (b.features_json || null),
    b.ai_features ? JSON.stringify(b.ai_features) : (b.ai_features_json || null),
  );
  res.status(201).json({ id: b.id, message: '资产已入库' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM assets WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: '资产不存在' });
  const fields = ['name', 'address', 'lng', 'lat', 'area', 'status', 'days_vacant', 'type',
    'estimated_price', 'monthly_rent', 'occupancy_rate', 'confidence', 'region',
    'received_batch', 'certificate_status', 'decoration_level', 'last_renovation',
    'default_free_rent_days', 'hidden_risks', 'features_json', 'ai_features_json'];
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      const val = req.body[f];
      if (['hidden_risks', 'features_json', 'ai_features_json'].includes(f) && typeof val === 'object') {
        params.push(JSON.stringify(val));
      } else {
        params.push(val);
      }
    }
  }
  if (updates.length === 0) return res.json({ message: '无更新字段' });
  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ id: req.params.id, message: '资产已更新' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '资产不存在' });
  res.json({ message: '资产已删除' });
});

export default router;
