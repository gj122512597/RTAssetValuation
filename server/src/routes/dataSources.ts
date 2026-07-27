import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * 数据源配置
 * - GET    /api/data-sources          列表
 * - GET    /api/data-sources/:id      详情
 * - POST   /api/data-sources          新增
 * - PUT    /api/data-sources/:id      更新
 * - DELETE /api/data-sources/:id      删除
 */

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM data_sources ORDER BY created_at').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '数据源不存在' });
  res.json(row);
});

router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  if (!b.id || !b.name || !b.source_type) {
    return res.status(400).json({ error: '缺少必填字段: id, name, source_type' });
  }
  db.prepare(`
    INSERT INTO data_sources (id, name, source_type, base_url, api_key, rate_limit_per_min, enabled, config_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.id, b.name, b.source_type, b.base_url || null, b.api_key || null,
    b.rate_limit_per_min ?? 60, b.enabled ?? 1,
    b.config_json ? JSON.stringify(b.config_json) : null,
  );
  res.status(201).json({ id: b.id, message: '数据源已创建' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM data_sources WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: '数据源不存在' });
  const fields = ['name', 'source_type', 'base_url', 'api_key', 'rate_limit_per_min', 'enabled', 'config_json'];
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'config_json' && typeof req.body[f] === 'object'
        ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ message: '无更新字段' });
  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE data_sources SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ id: req.params.id, message: '数据源已更新' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM data_sources WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '数据源不存在' });
  res.json({ message: '数据源已删除' });
});

export default router;
