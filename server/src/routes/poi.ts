import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * POI 周边配套数据
 * - GET    /api/poi          列表（?category=&asset_id=&region=&lng=&lat=&radius_km=）
 * - GET    /api/poi/:id      详情
 * - POST   /api/poi/batch    批量新增（高德 POI 抓取后写入）
 * - DELETE /api/poi/:id      删除
 * - GET    /api/poi/stats/by-asset/:asset_id  按资产聚合 POI 分类统计
 */

router.get('/', (req, res) => {
  const db = getDb();
  const { category, asset_id, region, lng, lat, radius_km } = req.query;
  let sql = 'SELECT * FROM poi_data WHERE 1=1';
  const params: unknown[] = [];
  if (category) { sql += ' AND category = ?'; params.push(String(category)); }
  if (asset_id) { sql += ' AND asset_id = ?'; params.push(String(asset_id)); }
  if (region) { sql += ' AND region = ?'; params.push(String(region)); }
  if (lng && lat && radius_km) {
    const lngNum = Number(lng), latNum = Number(lat), r = Number(radius_km);
    const latKm = 111;
    const lngKm = 111 * Math.cos(latNum * Math.PI / 180);
    sql += ` AND POWER((lng - ?) * ${lngKm}, 2) + POWER((lat - ?) * ${latKm}, 2) <= POWER(?, 2)`;
    params.push(lngNum, latNum, r);
  }
  sql += ' ORDER BY captured_at DESC LIMIT 1000';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/stats/by-asset/:asset_id', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT category, COUNT(*) AS count
    FROM poi_data
    WHERE asset_id = ?
    GROUP BY category
    ORDER BY count DESC
  `).all(req.params.asset_id);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM poi_data WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'POI 不存在' });
  res.json(row);
});

router.post('/batch', (req, res) => {
  const db = getDb();
  const list: unknown[] = Array.isArray(req.body) ? req.body : req.body.items;
  if (!Array.isArray(list)) return res.status(400).json({ error: '需传入数组或 { items: [] }' });
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO poi_data
      (id, source, source_id, name, category, sub_type, region, address, lng, lat,
       asset_id, distance_to_asset_m, rating, business_hours, phone, raw_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items: unknown[]) => {
    let saved = 0;
    for (const item of items) {
      const b = item as Record<string, unknown>;
      const r = stmt.run(
        b.id, b.source || 'amap', b.source_id || null, b.name, b.category,
        b.sub_type || null, b.region || null, b.address || null,
        b.lng ?? null, b.lat ?? null, b.asset_id || null,
        b.distance_to_asset_m ?? null, b.rating ?? null, b.business_hours || null,
        b.phone || null, b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
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
  const result = db.prepare('DELETE FROM poi_data WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'POI 不存在' });
  res.json({ message: 'POI 已删除' });
});

export default router;
