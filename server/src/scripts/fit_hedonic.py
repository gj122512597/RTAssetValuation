#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hedonic 模型真实拟合脚本（岭回归）

数据来源：server 端 SQLite 的 training_samples 表（统一训练样本池）
  - 由 server/src/routes/trainingSamples.ts 在首次启动时 seed 内置 10 条，
    并支持上传 / 手动新增样本汇入同一池。
  - 每行 data_json 已含「已派生特征矩阵」：基础信息(中文键) + 12 维 Hedonic 特征(英文键)
    + 真实月单位租金(元/㎡·月)。本脚本直接读特征，目标 y = ln(真实月单位租金 / 30)。

特征映射（项目 12 维 HedonicFeatureVector，与前端 FEATURE_META.key 一致）：
  subway_distance / condition_score / decoration_idx / certificate_idx /
  is_cbd / is_inner / log_area / school_score / commercial_density /
  deco_age / free_rent_idx / base_price_log

方法：标准化后岭回归（LOO-CV 选 λ）→ 反变换回原始尺度系数，直接写入 hedonic_models 表。

触发方式：
  - 后端 POST /api/training-samples/refit 内部调用 `python3 fit_hedonic.py`
  - 也可手动：`python3 server/src/scripts/fit_hedonic.py`
（运行前请确保后端已启动过一次，training_samples / hedonic_models 表已就绪）
"""
import math
import json
import os
import sqlite3
import numpy as np
from statistics import median

# 必须与 server/src/db.ts 的 DB_PATH 一致：join(__dirname,'../../data/rt_asset.db')
# 脚本位于 server/src/scripts/fit_hedonic.py，向上 4 层到达项目根
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DB_PATH = os.path.join(_ROOT, "data", "rt_asset.db")

COMPARATIVE_FEATS = [
    'subway_distance', 'condition_score', 'decoration_idx', 'certificate_idx',
    'is_cbd', 'is_inner', 'log_area', 'school_score', 'commercial_density',
    'deco_age', 'free_rent_idx', 'base_price_log',
]
HISTORICAL_FEATS = ['base_price_log', 'decoration_idx', 'deco_age', 'free_rent_idx']


def fnum(v, default=None):
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


# ----------------------------- 1. 读取训练样本池 -----------------------------
def load_samples():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"[ERROR] 找不到数据库 {DB_PATH}，请先启动后端以初始化 training_samples 表")
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    try:
        cur.execute("SELECT data_json FROM training_samples")
        rows = cur.fetchall()
    except sqlite3.OperationalError:
        con.close()
        raise SystemExit("[ERROR] training_samples 表不存在，请先启动后端以初始化")
    con.close()
    if not rows:
        raise SystemExit("[ERROR] training_samples 为空，无样本可训练")

    data = []
    for (dj,) in rows:
        d = json.loads(dj)
        true_monthly = fnum(d.get('真实月单位租金'))
        if true_monthly is None or true_monthly <= 0:
            print(f"[WARN] 样本 {d.get('资产名称', '?')} 缺失有效真实月单位租金，已跳过")
            continue
        y = math.log(true_monthly / 30.0)
        data.append({
            'y': y,
            'subway_distance': fnum(d.get('subway_distance'), 0.0),
            'condition_score': fnum(d.get('condition_score'), 0.0),
            'decoration_idx': fnum(d.get('decoration_idx'), 0.0),
            'certificate_idx': fnum(d.get('certificate_idx'), 0.0),
            'is_cbd': fnum(d.get('is_cbd'), 0.0),
            'is_inner': fnum(d.get('is_inner'), 0.0),
            'log_area': fnum(d.get('log_area'), 0.0),
            'school_score': fnum(d.get('school_score'), 0.0),
            'commercial_density': fnum(d.get('commercial_density'), 0.0),
            'deco_age': fnum(d.get('deco_age'), 0.0),
            'free_rent_idx': fnum(d.get('free_rent_idx'), 0.0),
            'base_price_log': fnum(d.get('base_price_log'), 0.0),
            'district': d.get('商圈等级', ''),
            'true_monthly': true_monthly,
        })
    if not data:
        raise SystemExit("[ERROR] 无有效样本（真实月单位租金缺失），无法训练")
    return data


# ----------------------------- 2. 岭回归拟合 -----------------------------
def fit(feat_names, data, lamb=1.0):
    X = np.array([[d[f] for f in feat_names] for d in data], dtype=float)
    y = np.array([d['y'] for d in data], dtype=float)
    means = X.mean(0)
    stds = X.std(0)
    stds[stds == 0] = 1.0
    Xs = (X - means) / stds
    Xs1 = np.hstack([np.ones((len(Xs), 1)), Xs])
    A = Xs1.T @ Xs1 + lamb * np.eye(Xs1.shape[1])
    b = np.linalg.solve(A, Xs1.T @ y)
    intercept_std, beta_std = b[0], b[1:]
    beta_raw = beta_std / stds
    intercept_raw = intercept_std - float((beta_std * means / stds).sum())

    yhat = intercept_raw + X @ beta_raw
    ss_res = float(((y - yhat) ** 2).sum())
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

    fmeans = {f: float(means[i]) for i, f in enumerate(feat_names)}
    imp = np.abs(beta_std)
    imp_sum = float(imp.sum()) or 1.0
    fimp = {f: float(imp[i] / imp_sum) for i, f in enumerate(feat_names)}
    base = math.exp(intercept_raw + sum(beta_raw[i] * means[i] for i in range(len(feat_names))))
    coef = {f: float(beta_raw[i]) for i, f in enumerate(feat_names)}
    return {
        'intercept': float(intercept_raw),
        'coefficients': coef,
        'feature_means': fmeans,
        'feature_importance': fimp,
        'base_score': float(base),
        'r2': float(r2),
    }


def loo_cv(feat_names, data, lamb):
    X = np.array([[d[f] for f in feat_names] for d in data], dtype=float)
    y = np.array([d['y'] for d in data], dtype=float)
    n = len(y)
    errs = []
    for i in range(n):
        tr = np.arange(n) != i
        Xtr, ytr = X[tr], y[tr]
        Xte = X[i]
        m = Xtr.mean(0)
        s = Xtr.std(0)
        s[s == 0] = 1.0
        Xtr_s = (Xtr - m) / s
        Xtr_s1 = np.hstack([np.ones((len(Xtr_s), 1)), Xtr_s])
        A = Xtr_s1.T @ Xtr_s1 + lamb * np.eye(Xtr_s1.shape[1])
        b = np.linalg.solve(A, Xtr_s1.T @ ytr)
        beta_raw = b[1:] / s
        inter = b[0] - float((b[1:] * m / s).sum())
        pred_te = inter + float(Xte @ beta_raw)
        errs.append((pred_te - y[i]) ** 2)
    return float(np.mean(errs))


def pick_lambda(feat_names, data):
    best, best_err = 1.0, float('inf')
    for lamb in [1e-3, 1e-2, 1e-1, 1.0, 10.0, 100.0]:
        err = loo_cv(feat_names, data, lamb)
        if err < best_err:
            best, best_err = lamb, err
    return best


# ----------------------------- 3. 写库 -----------------------------
CREATE_SQL = """
CREATE TABLE IF NOT EXISTS hedonic_models (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  method                  TEXT NOT NULL UNIQUE,
  name                    TEXT,
  intercept               REAL,
  coefficients_json       TEXT,
  feature_means_json      TEXT,
  feature_importance_json TEXT,
  base_score              REAL,
  r2                      REAL,
  updated_at              TEXT DEFAULT (datetime('now'))
);
"""


def upsert(db, method, model):
    model['name'] = 'Hedonic · 市场比较法' if method == 'comparative' else 'Hedonic · 历史数据法'
    row = {
        'method': method,
        'name': model['name'],
        'intercept': model['intercept'],
        'coefficients_json': json.dumps(model['coefficients'], ensure_ascii=False),
        'feature_means_json': json.dumps(model['feature_means'], ensure_ascii=False),
        'feature_importance_json': json.dumps(model['feature_importance'], ensure_ascii=False),
        'base_score': model['base_score'],
        'r2': model['r2'],
    }
    db.execute(CREATE_SQL)
    db.execute("""
        INSERT INTO hedonic_models
          (method, name, intercept, coefficients_json, feature_means_json, feature_importance_json, base_score, r2)
        VALUES (@method, @name, @intercept, @coefficients_json, @feature_means_json, @feature_importance_json, @base_score, @r2)
        ON CONFLICT(method) DO UPDATE SET
          name=@name, intercept=@intercept,
          coefficients_json=@coefficients_json, feature_means_json=@feature_means_json,
          feature_importance_json=@feature_importance_json, base_score=@base_score, r2=@r2,
          updated_at=datetime('now')
    """, row)


# ----------------------------- 主流程 -----------------------------
def main():
    data = load_samples()
    print(f"[ETL] 训练样本数 = {len(data)}")
    for d in data:
        print(f"      y(ln日租金)={d['y']:.3f}  真实月单位租金={d['true_monthly']:.1f}  base_price_log={d['base_price_log']:.3f}")

    out = {}
    for method, feats in [('comparative', COMPARATIVE_FEATS), ('historical', HISTORICAL_FEATS)]:
        lamb = pick_lambda(feats, data)
        m = fit(feats, data, lamb)
        m['lambda'] = lamb
        out[method] = m
        print(f"\n=== {method} (λ={lamb}) ===")
        print(f"  R²={m['r2']:.4f}  base_score={m['base_score']:.3f} 元/㎡·天  intercept={m['intercept']:.4f}")
        print("  系数:")
        for k, v in m['coefficients'].items():
            print(f"    {k:20s} β={v:+.5f}  μ={m['feature_means'][k]:.3f}  imp={m['feature_importance'][k]:.3f}")

    # 落盘 JSON 备份
    json_path = os.path.join(os.path.dirname(__file__), 'hedonic_fitted.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n[SAVE] 拟合结果已备份到 {json_path}")

    # 写 SQLite
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    upsert(db, 'comparative', out['comparative'])
    upsert(db, 'historical', out['historical'])
    db.commit()
    # 校验
    for method in ('comparative', 'historical'):
        row = db.execute("SELECT method, r2, base_score FROM hedonic_models WHERE method=?", (method,)).fetchone()
        print(f"[DB] {row[0]}: r2={row[1]:.4f} base_score={row[2]:.3f}  ✓ 已写入")
    db.close()
    print("\n完成。前端 GET /api/models/hedonic/:method 现在返回最新拟合系数。")


if __name__ == '__main__':
    main()
