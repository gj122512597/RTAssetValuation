import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * 竞品挂牌数据
 * - GET    /api/competitors          列表（支持 ?source=&region=&type=&lng=&lat=&radius_km= 空间查询）
 * - GET    /api/competitors/:id      详情
 * - POST   /api/competitors          新增（爬虫写入）
 * - POST   /api/competitors/batch    批量新增（爬虫写入）
 * - PUT    /api/competitors/:id      更新
 * - DELETE /api/competitors/:id      删除
 */

// 列表（支持空间半径查询）
router.get('/', (req, res) => {
  const db = getDb();
  const { source, region, type, lng, lat, radius_km } = req.query;
  let sql = 'SELECT * FROM competitor_listings WHERE 1=1';
  const params: unknown[] = [];
  if (source) { sql += ' AND source = ?'; params.push(String(source)); }
  if (region) { sql += ' AND region = ?'; params.push(String(region)); }
  if (type) { sql += ' AND type = ?'; params.push(String(type)); }
  // 空间半径查询：用 Haversine 近似（SQLite 无原生 GIS，用简化公式）
  if (lng && lat && radius_km) {
    const lngNum = Number(lng), latNum = Number(lat), r = Number(radius_km);
    // 经纬度差转 km：纬度 1°≈111km，经度 1°≈111*cos(lat)km
    const latKm = 111;
    const lngKm = 111 * Math.cos(latNum * Math.PI / 180);
    sql += ` AND (
      POWER((lng - ?) * ${lngKm}, 2) + POWER((lat - ?) * ${latKm}, 2) <= POWER(?, 2)
    )`;
    params.push(lngNum, latNum, r);
  }
  sql += ' ORDER BY captured_at DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// 详情
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM competitor_listings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '竞品不存在' });
  res.json(row);
});

// 新增
router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  if (!b.id || !b.source || !b.name || !b.captured_at) {
    return res.status(400).json({ error: '缺少必填字段: id, source, name, captured_at' });
  }
  try {
    db.prepare(`
      INSERT INTO competitor_listings
        (id, source, source_id, name, region, address, lng, lat, type,
         list_price, property_fee, occupancy_rate, layout, area_sqm, floor_info,
         contact_phone, listing_url, raw_json, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.id, b.source, b.source_id || null, b.name, b.region || null, b.address || null,
      b.lng ?? null, b.lat ?? null, b.type || null,
      b.list_price ?? null, b.property_fee ?? null, b.occupancy_rate ?? null,
      b.layout || null, b.area_sqm ?? null, b.floor_info || null,
      b.contact_phone || null, b.listing_url || null,
      b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
    );
    res.status(201).json({ id: b.id, message: '竞品已入库' });
  } catch (e: unknown) {
    const err = e as { code?: string; message: string };
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: '重复数据（source+source_id 已存在）' });
    }
    throw e;
  }
});

// 批量新增（爬虫常用）
router.post('/batch', (req, res) => {
  const db = getDb();
  const list: unknown[] = Array.isArray(req.body) ? req.body : req.body.items;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: '需传入数组或 { items: [] }' });
  }
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO competitor_listings
      (id, source, source_id, name, region, address, lng, lat, type,
       list_price, property_fee, occupancy_rate, layout, area_sqm, floor_info,
       contact_phone, listing_url, raw_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items: unknown[]) => {
    let saved = 0;
    for (const item of items) {
      const b = item as Record<string, unknown>;
      const r = stmt.run(
        b.id, b.source, b.source_id || null, b.name, b.region || null, b.address || null,
        b.lng ?? null, b.lat ?? null, b.type || null,
        b.list_price ?? null, b.property_fee ?? null, b.occupancy_rate ?? null,
        b.layout || null, b.area_sqm ?? null, b.floor_info || null,
        b.contact_phone || null, b.listing_url || null,
        b.raw_json ? JSON.stringify(b.raw_json) : null, b.captured_at,
      );
      if (r.changes > 0) saved++;
    }
    return saved;
  });
  const saved = tx(list);
  res.status(201).json({ total: list.length, saved, skipped: list.length - saved });
});

// 更新
router.put('/:id', (req, res) => {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM competitor_listings WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: '竞品不存在' });
  const fields = ['source_id', 'name', 'region', 'address', 'lng', 'lat', 'type',
    'list_price', 'property_fee', 'occupancy_rate', 'layout', 'area_sqm', 'floor_info',
    'contact_phone', 'listing_url', 'raw_json', 'captured_at'];
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'raw_json' && typeof req.body[f] === 'object'
        ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ message: '无更新字段' });
  params.push(req.params.id);
  db.prepare(`UPDATE competitor_listings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ id: req.params.id, message: '竞品已更新' });
});

// 删除
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM competitor_listings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '竞品不存在' });
  res.json({ message: '竞品已删除' });
});

export default router;
