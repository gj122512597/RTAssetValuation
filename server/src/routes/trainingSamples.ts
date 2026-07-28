import express from 'express';
import { Router } from 'express';
import { getDb } from '../db.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'child_process';

// ESM 下 __dirname 不可用，用 import.meta.url 推导
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 训练样本管理 + 模型重训触发
 *
 * 数据来源（已派生特征矩阵模板）：
 *   training_samples 表是一份「统一训练样本池」——
 *     - seed：内置 10 条（source='builtin'，与前端 TRAINING_SAMPLES 一致）
 *     - 上传（source='upload'）/ 手动新增（source='manual'）汇入同一池
 *   fit_hedonic.py 训练时按 method 取 COMPARATIVE_FEATS / HISTORICAL_FEATS 子集拟合。
 *
 * data_json 结构与前端 TrainingSample 完全一致（基础信息中文键 + 12 维特征英文键）。
 */
const router = Router();
const TABLE = 'training_samples';

/** 内置 10 条训练样本（与 src/data/hedonicTrainingData.ts 的 TRAINING_SAMPLES 一一对应） */
const BUILTIN_SAMPLES: Record<string, unknown>[] = [
  { '序号': 1, '资产名称': '中海大厦', '挂牌编码': '35353536030', '行政区': '市北区', '商圈等级': '核心商圈', '经度': 120.3684036, '纬度': 36.0870737, '建筑面积': 500, '真实月单位租金': 85.20, 'y_ln日租金': 1.0438, 'subway_distance': 690, 'condition_score': 5.62, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.2699, 'school_score': 10, 'commercial_density': 8.33, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 2, '资产名称': '新澳国际', '挂牌编码': '686610825961', '行政区': '李沧区', '商圈等级': '次核心商圈', '经度': 120.4277878, '纬度': 36.1606941, '建筑面积': 860, '真实月单位租金': 57.80, 'y_ln日租金': 0.6558, 'subway_distance': 9326, 'condition_score': 4.62, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 0, 'is_inner': 0, 'log_area': 0.2934, 'school_score': 0, 'commercial_density': 3.33, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.8598 },
  { '序号': 3, '资产名称': '万邦中心', '挂牌编码': '595638952867', '行政区': '市南区', '商圈等级': '核心商圈', '经度': 120.3690650, '纬度': 36.0605333, '建筑面积': 2087, '真实月单位租金': 59.99, 'y_ln日租金': 0.6930, 'subway_distance': 1397, 'condition_score': 4.62, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.3320, 'school_score': 0, 'commercial_density': 3.33, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 4, '资产名称': '卓越·世纪中心', '挂牌编码': '82362159814', '行政区': '市北区', '商圈等级': '核心商圈', '经度': 120.3768930, '纬度': 36.0879018, '建筑面积': 500, '真实月单位租金': 75.00, 'y_ln日租金': 0.9163, 'subway_distance': 81, 'condition_score': 5.62, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.2699, 'school_score': 10, 'commercial_density': 8.33, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 5, '资产名称': '金孚大厦', '挂牌编码': '300638032261', '行政区': '市南区', '商圈等级': '核心商圈', '经度': 120.3709793, '纬度': 36.0770950, '建筑面积': 179, '真实月单位租金': 42.00, 'y_ln日租金': 0.3365, 'subway_distance': 1294, 'condition_score': 5.07, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.2253, 'school_score': 0, 'commercial_density': 3.33, 'deco_age': 10.0, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 6, '资产名称': 'SIIC上实中心', '挂牌编码': '490551162936', '行政区': '崂山区', '商圈等级': '核心商圈', '经度': 120.4603102, '纬度': 36.0968151, '建筑面积': 210, '真实月单位租金': 90.00, 'y_ln日租金': 1.0986, 'subway_distance': 4467, 'condition_score': 7.08, 'decoration_idx': 3, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.2322, 'school_score': 10, 'commercial_density': 8.33, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 7, '资产名称': '华普大厦', '挂牌编码': '310365418095', '行政区': '市南区', '商圈等级': '核心商圈', '经度': 120.3898107, '纬度': 36.0646724, '建筑面积': 150, '真实月单位租金': 55.55, 'y_ln日租金': 0.6161, 'subway_distance': 528, 'condition_score': 3.77, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.2176, 'school_score': 0, 'commercial_density': 3.33, 'deco_age': 23.0, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 8, '资产名称': '华仁国际大厦', '挂牌编码': '976582742612', '行政区': '市南区', '商圈等级': '核心商圈', '经度': 120.3764371, '纬度': 36.0624070, '建筑面积': 230, '真实月单位租金': 106.89, 'y_ln日租金': 1.2706, 'subway_distance': 702, 'condition_score': 5.62, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.2362, 'school_score': 0, 'commercial_density': 3.33, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
  { '序号': 9, '资产名称': '银盛泰国际商务港', '挂牌编码': '23316335485', '行政区': '城阳区', '商圈等级': '次核心商圈', '经度': 120.3939285, '纬度': 36.3044014, '建筑面积': 240, '真实月单位租金': 47.08, 'y_ln日租金': 0.4507, 'subway_distance': 9114, 'condition_score': 7.08, 'decoration_idx': 3, 'certificate_idx': 0, 'is_cbd': 0, 'is_inner': 0, 'log_area': 0.2380, 'school_score': 0, 'commercial_density': 6.67, 'deco_age': 14.5, 'free_rent_idx': 2, 'base_price_log': 0.8598 },
  { '序号': 10, '资产名称': '世纪大厦', '挂牌编码': 'QD00639026', '行政区': '市南区', '商圈等级': '核心商圈', '经度': 120.3842029, '纬度': 36.0632535, '建筑面积': 1500, '真实月单位租金': 75.00, 'y_ln日租金': 0.9163, 'subway_distance': 85, 'condition_score': 5.17, 'decoration_idx': 1, 'certificate_idx': 0, 'is_cbd': 1, 'is_inner': 0, 'log_area': 0.3176, 'school_score': 0, 'commercial_density': 3.33, 'deco_age': 19.0, 'free_rent_idx': 2, 'base_price_log': 0.9375 },
];

function ensureTable(db: import('better-sqlite3').Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id          TEXT PRIMARY KEY,
    source      TEXT NOT NULL DEFAULT 'manual',
    data_json   TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

/** 首次启动时把内置 10 条写入（幂等） */
export function initTrainingSamples(): void {
  const db = getDb();
  ensureTable(db);
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM ${TABLE}`).get() as { c: number };
  if (c === 0) {
    const ins = db.prepare(`INSERT OR IGNORE INTO ${TABLE} (id, source, data_json) VALUES (?, 'builtin', ?)`);
    const tx = db.transaction((rows: Record<string, unknown>[]) => {
      rows.forEach((r, i) => ins.run(`TS-BUILTIN-${String(i + 1).padStart(2, '0')}`, JSON.stringify(r)));
    });
    tx(BUILTIN_SAMPLES);
    console.log(`[training-samples] 已 seed ${BUILTIN_SAMPLES.length} 条内置训练样本`);
  }
}

/** 计算 y_ln日租金 = ln(真实月单位租金 / 30) */
function withY(d: Record<string, unknown>): Record<string, unknown> {
  const out = { ...d };
  if (out['真实月单位租金'] != null && out['y_ln日租金'] == null) {
    out['y_ln日租金'] = Math.log(Number(out['真实月单位租金']) / 30);
  }
  return out;
}

function rowToPayload(row: { id: string; source: string; created_at: string; data_json: string }) {
  return { id: row.id, source: row.source, created_at: row.created_at, ...JSON.parse(row.data_json) };
}

// GET 列表（展开 data_json，便于 antd Table 直接使用中文键列）
router.get('/', (_req, res) => {
  const db = getDb();
  ensureTable(db);
  initTrainingSamples();
  const rows = db.prepare(`SELECT id, source, created_at, data_json FROM ${TABLE} ORDER BY created_at ASC, id ASC`).all() as {
    id: string; source: string; created_at: string; data_json: string;
  }[];
  res.json(rows.map(rowToPayload));
});

// POST 新增（upload / manual）
router.post('/', (req, res) => {
  const db = getDb();
  ensureTable(db);
  const data = req.body?.data;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data 必填（训练样本字段对象）' });
  }
  if (data['真实月单位租金'] == null || Number(data['真实月单位租金']) <= 0) {
    return res.status(400).json({ error: '真实月单位租金必填且须 > 0' });
  }
  const cleaned = withY(data as Record<string, unknown>);
  const id = 'TS-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const source = req.body?.source === 'upload' ? 'upload' : 'manual';
  db.prepare(`INSERT INTO ${TABLE} (id, source, data_json) VALUES (?, ?, ?)`).run(id, source, JSON.stringify(cleaned));
  res.status(201).json({ id, source, ...cleaned });
});

// PUT 更新一条
router.put('/:id', (req, res) => {
  const db = getDb();
  ensureTable(db);
  const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(req.params.id) as
    | { id: string; source: string; created_at: string; data_json: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: '训练样本不存在' });
  const base = JSON.parse(existing.data_json);
  const incoming = req.body?.data ?? {};
  const merged = withY({ ...base, ...incoming });
  db.prepare(`UPDATE ${TABLE} SET data_json = ? WHERE id = ?`).run(JSON.stringify(merged), req.params.id);
  res.json({ id: req.params.id, source: existing.source, created_at: existing.created_at, ...merged });
});

// DELETE 删除
router.delete('/:id', (req, res) => {
  const db = getDb();
  ensureTable(db);
  db.prepare(`DELETE FROM ${TABLE} WHERE id = ?`).run(req.params.id);
  res.status(204).end();
});

// POST /refit —— 触发 Python 离线拟合脚本重训（全量重训含新样本）
router.post('/refit', (_req, res) => {
  const py = process.env.PYTHON_PATH || 'python3';
  const script = join(__dirname, '../scripts/fit_hedonic.py');
  execFile(py, [script], { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[refit] 失败:', stderr || err.message);
      return res.status(500).json({ ok: false, error: String(stderr || err.message || err) });
    }
    res.json({ ok: true, stdout: stdout.slice(-1000) });
  });
});

export default router;
