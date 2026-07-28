import { Router } from 'express';
import { getDb } from '../db.js';

/**
 * Hedonic 定价模型接口
 * - GET    /api/models/hedonic/:method   获取训练好的模型系数（comparative | historical）
 * - PUT    /api/models/hedonic/:method   写入/更新训练好的模型系数（上传真实训练结果）
 * - POST   /api/models/predict           { method, features } → 服务端推理（模型不外泄时使用）
 *
 * 模型系数初次启动时自动从内置 BUILTIN 种子写入（与前端 src/utils/hedonicModel.ts 对齐），
 * 用户训练出新模型后通过 PUT 覆盖即可，前端拉取即生效。
 */

// 与前端内置模型保持一致的镜像（避免跨包依赖）
interface HedonicModel {
  name: string;
  intercept: number;
  coefficients: Record<string, number>;
  feature_means: Record<string, number>;
  feature_importance: Record<string, number>;
  base_score: number;
  r2: number;
}

const BUILTIN: Record<string, HedonicModel> = {
  comparative: {
    name: 'Hedonic · 市场比较法',
    // 由青岛商业办公出租样本（n=10）经 ETL + 岭回归拟合
    intercept: -6.1592,
    coefficients: {
      subway_distance: 0.000084,
      condition_score: 0.49865,
      decoration_idx: -0.48560,
      certificate_idx: 0.0,
      is_cbd: 0.32149,
      is_inner: 0.0,
      log_area: 0.21869,
      school_score: 0.05305,
      commercial_density: -0.11118,
      deco_age: 0.06369,
      free_rent_idx: 0.0,
      base_price_log: 4.13799,
    },
    feature_means: {
      subway_distance: 2768.4,
      condition_score: 5.425,
      decoration_idx: 1.4,
      certificate_idx: 0.0,
      is_cbd: 0.8,
      is_inner: 0.0,
      log_area: 0.2632,
      school_score: 3.0,
      commercial_density: 5.1667,
      deco_age: 15.35,
      free_rent_idx: 2.0,
      base_price_log: 0.9220,
    },
    feature_importance: {
      condition_score: 0.2310,
      subway_distance: 0.1353,
      decoration_idx: 0.1812,
      commercial_density: 0.1188,
      school_score: 0.1134,
      deco_age: 0.0965,
      is_cbd: 0.0600,
      base_price_log: 0.0600,
      log_area: 0.0039,
      certificate_idx: 0.0,
      is_inner: 0.0,
      free_rent_idx: 0.0,
    },
    base_score: 2.2075,
    r2: 0.8459,
  },
  historical: {
    name: 'Hedonic · 历史数据法',
    // 由青岛商业办公出租样本（n=10）经 ETL + 岭回归拟合
    intercept: -2.9991,
    coefficients: {
      base_price_log: 3.88451,
      decoration_idx: 0.03997,
      deco_age: 0.00578,
      free_rent_idx: 0.0,
    },
    feature_means: {
      base_price_log: 0.9220,
      decoration_idx: 1.4,
      deco_age: 15.35,
      free_rent_idx: 2.0,
    },
    feature_importance: {
      base_price_log: 0.7040,
      decoration_idx: 0.1865,
      deco_age: 0.1095,
      free_rent_idx: 0.0,
    },
    base_score: 2.0690,
    r2: 0.1424,
  },
};

const router = Router();

function rowToModel(row: Record<string, unknown>): HedonicModel & { method: string } {
  return {
    method: String(row.method),
    name: String(row.name),
    intercept: Number(row.intercept),
    coefficients: JSON.parse(String(row.coefficients_json)),
    feature_means: JSON.parse(String(row.feature_means_json)),
    feature_importance: JSON.parse(String(row.feature_importance_json)),
    base_score: Number(row.base_score),
    r2: Number(row.r2),
  };
}

function modelToRow(method: string, m: HedonicModel) {
  return {
    method,
    name: m.name,
    intercept: m.intercept,
    coefficients_json: JSON.stringify(m.coefficients),
    feature_means_json: JSON.stringify(m.feature_means),
    feature_importance_json: JSON.stringify(m.feature_importance),
    base_score: m.base_score,
    r2: m.r2,
  };
}

// 首次启动：把内置模型写入库（幂等）
function ensureSeed() {
  const db = getDb();
  for (const [method, m] of Object.entries(BUILTIN)) {
    const exists = db.prepare('SELECT 1 FROM hedonic_models WHERE method = ?').get(method);
    if (!exists) {
      const r = modelToRow(method, m);
      db.prepare(`
        INSERT INTO hedonic_models
          (method, name, intercept, coefficients_json, feature_means_json, feature_importance_json, base_score, r2)
        VALUES (@method, @name, @intercept, @coefficients_json, @feature_means_json, @feature_importance_json, @base_score, @r2)
      `).run(r);
    }
  }
}
ensureSeed();

// 服务端推理（与前端 hedonicPredict 对齐）
function predict(model: HedonicModel, x: Record<string, number>) {
  let logPrice = model.intercept;
  const contributions: { feature: string; contribution: number; source: string }[] = [];
  for (const [feature, beta] of Object.entries(model.coefficients)) {
    const xi = x[feature] ?? 0;
    const mean = model.feature_means[feature] ?? 0;
    logPrice += beta * xi;
    const contribution = Number((beta * (xi - mean)).toFixed(4));
    contributions.push({
      feature,
      contribution,
      source: `β=${beta}, xi=${xi.toFixed(2)}, μ=${mean.toFixed(2)}, 贡献=β×(xi-μ)=${contribution}`,
    });
  }
  const prediction = Number(Math.exp(logPrice).toFixed(2));
  return { prediction, contributions };
}

function loadModel(method: string): HedonicModel {
  const db = getDb();
  const row = db.prepare('SELECT * FROM hedonic_models WHERE method = ?').get(method) as
    | Record<string, unknown>
    | undefined;
  if (row) return rowToModel(row);
  // 库里没有就用内置兜底
  const builtin = BUILTIN[method];
  if (!builtin) throw new Error(`未知模型方法: ${method}`);
  return builtin;
}

// GET /api/models/hedonic/:method
router.get('/hedonic/:method', (req, res) => {
  const { method } = req.params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM hedonic_models WHERE method = ?').get(method) as
    | Record<string, unknown>
    | undefined;
  if (!row) return res.status(404).json({ error: '模型不存在', method });
  res.json(rowToModel(row));
});

// PUT /api/models/hedonic/:method —— 写入/覆盖训练好的模型
router.put('/hedonic/:method', (req, res) => {
  const { method } = req.params;
  const b = req.body as Partial<HedonicModel>;
  if (!b.intercept || !b.coefficients || !b.feature_means) {
    return res.status(400).json({ error: '缺少必填字段: intercept, coefficients, feature_means' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM hedonic_models WHERE method = ?').get(method);
  const r = modelToRow(method, b as HedonicModel);
  if (exists) {
    db.prepare(`
      UPDATE hedonic_models SET
        name = @name, intercept = @intercept,
        coefficients_json = @coefficients_json, feature_means_json = @feature_means_json,
        feature_importance_json = @feature_importance_json, base_score = @base_score, r2 = @r2,
        updated_at = datetime('now')
      WHERE method = @method
    `).run(r);
  } else {
    db.prepare(`
      INSERT INTO hedonic_models
        (method, name, intercept, coefficients_json, feature_means_json, feature_importance_json, base_score, r2)
      VALUES (@method, @name, @intercept, @coefficients_json, @feature_means_json, @feature_importance_json, @base_score, @r2)
    `).run(r);
  }
  res.json({ method, message: '模型系数已保存', model: rowToModel(modelToRow(method, b as HedonicModel)) });
});

// POST /api/models/predict —— 后端「独立推理」：系数留服务端，只回预测值与贡献分解
// 入参：{ method: 'comparative'|'historical', features: Record<string, number> }
// 返回：{ method, prediction, contributions, name, r2 }
router.post('/predict', (req, res) => {
  const { method, features } = req.body as { method: string; features: Record<string, number> };
  if (!method || !features || typeof features !== 'object') {
    return res.status(400).json({ error: '缺少必填字段: method, features' });
  }
  try {
    const model = loadModel(method);
    const result = predict(model, features);
    // 独立推理：不向前端泄露模型系数，只回预测值与 SHAP 风格贡献分解
    res.json({
      method,
      prediction: result.prediction,
      contributions: result.contributions,
      name: model.name,
      r2: model.r2,
    });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;
