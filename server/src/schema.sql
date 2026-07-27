-- ============================================================
-- XX地产资产评估系统 - 数据库表结构
-- 数据库：SQLite
-- 用途：存储爬取的外部数据（竞品挂牌/历史成交/POI/政府数据）+ 爬虫任务管理
-- 设计原则：
--   1. 与前端 src/types/index.ts 数据模型对齐
--   2. 每条爬取数据保留 raw_json 原始字段，便于回溯
--   3. (source, source_id) 唯一约束，避免重复爬取
--   4. 所有时间字段使用 ISO8601 字符串（SQLite 无原生 datetime）
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ------------------------------------------------------------
-- 1. 数据源配置表（爬虫/ API/ 人工录入）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,                  -- 数据源名称（贝壳/58/房天下/链家/高德/政府公开）
  source_type     TEXT NOT NULL,                  -- crawler | api | manual
  base_url        TEXT,
  api_key         TEXT,                           -- 若为 API 类型，密钥（生产环境应加密）
  rate_limit_per_min INTEGER DEFAULT 60,          -- 限流：每分钟请求数
  enabled         INTEGER DEFAULT 1,              -- 1=启用 0=禁用
  config_json     TEXT,                           -- 其他配置（headers/proxy/cookies 等）
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 2. 爬虫任务表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawl_tasks (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,                  -- 任务名称
  source          TEXT NOT NULL,                  -- beike | 58 | fangtianxia | lianjia | amap | government
  task_type       TEXT NOT NULL,                  -- competitor | transaction | poi | government
  region          TEXT,                           -- 目标区域，如 "北京/朝阳"
  schedule_cron   TEXT,                           -- 调度 cron 表达式（可空表示手动触发）
  status          TEXT DEFAULT 'paused',          -- running | paused | error
  config_json     TEXT,                           -- 任务参数（关键词/半径/筛选条件等）
  last_run_at     TEXT,
  next_run_at     TEXT,
  record_count    INTEGER DEFAULT 0,              -- 累计入库记录数
  manual_calibrated INTEGER DEFAULT 0,            -- 人工校准数量
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_crawl_tasks_source ON crawl_tasks(source);
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_status ON crawl_tasks(status);

-- ------------------------------------------------------------
-- 3. 爬取日志表（每次任务运行的详细日志）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawl_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id         TEXT NOT NULL,
  started_at      TEXT NOT NULL,
  finished_at     TEXT,
  status          TEXT NOT NULL,                  -- success | failed | running
  records_fetched INTEGER DEFAULT 0,              -- 抓取到的原始记录数
  records_saved   INTEGER DEFAULT 0,              -- 实际入库数（去重后）
  records_skipped INTEGER DEFAULT 0,              -- 跳过数（重复/过滤）
  error_message   TEXT,
  log_detail      TEXT,                           -- 详细日志（多行文本）
  FOREIGN KEY (task_id) REFERENCES crawl_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_task_id ON crawl_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at);

-- ------------------------------------------------------------
-- 4. 竞品挂牌数据表（链家/贝壳/58/房天下）
--    对应前端类型：Competitor（src/types/index.ts）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitor_listings (
  id              TEXT PRIMARY KEY,               -- 内部 ID
  source          TEXT NOT NULL,                  -- beike | 58 | fangtianxia | lianjia
  source_id       TEXT,                           -- 源站 ID
  name            TEXT NOT NULL,                  -- 楼盘/房源名称
  region          TEXT,
  address         TEXT,
  lng             REAL,                           -- 经度（GCJ-02/高德坐标系）
  lat             REAL,                           -- 纬度
  type            TEXT,                           -- office | retail | hotel | apartment | warehouse | plant
  list_price      REAL,                           -- 挂牌价 元/㎡·天
  property_fee    REAL,                           -- 物业费 元/㎡·月
  occupancy_rate  REAL,                           -- 0~1
  layout          TEXT,                           -- 户型描述
  area_sqm        REAL,                           -- 面积 ㎡
  floor_info      TEXT,                           -- 楼层信息
  contact_phone   TEXT,
  listing_url     TEXT,
  raw_json        TEXT,                           -- 原始爬取数据（完整 HTML 解析结果）
  captured_at     TEXT NOT NULL,                  -- 数据抓取时间
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_source ON competitor_listings(source);
CREATE INDEX IF NOT EXISTS idx_comp_region ON competitor_listings(region);
CREATE INDEX IF NOT EXISTS idx_comp_type ON competitor_listings(type);
CREATE INDEX IF NOT EXISTS idx_comp_lnglat ON competitor_listings(lng, lat);
CREATE INDEX IF NOT EXISTS idx_comp_captured ON competitor_listings(captured_at);

-- ------------------------------------------------------------
-- 5. 历史成交记录表（链家/贝壳成交数据）
--    对应前端类型：Transaction（src/types/index.ts）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions_history (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT,                           -- 关联内部资产 ID（可空，未关联时为外部成交）
  source          TEXT NOT NULL,                  -- beike | lianjia | fangtianxia | internal_erp
  source_id       TEXT,
  property_name   TEXT NOT NULL,                  -- 成交物业名称
  region          TEXT,
  address         TEXT,
  lng             REAL,
  lat             REAL,
  type            TEXT,                           -- 业态
  deal_date       TEXT NOT NULL,                  -- 成交日期 YYYY-MM-DD
  deal_price      REAL NOT NULL,                  -- 成交价 元/㎡·天
  total_price     REAL,                           -- 总价 元
  area_sqm        REAL,
  tenant          TEXT,                           -- 租客/买方
  lease_term_months INTEGER,                     -- 租期月数
  free_rent_days  INTEGER,                        -- 免租期天
  deposit_months  INTEGER,                        -- 押金月数
  annual_increment_pct REAL,                      -- 年递增率 %
  deal_type       TEXT,                           -- new | renewal | handover
  performance     TEXT,                           -- good | early_exit | overdue
  notes           TEXT,
  raw_json        TEXT,
  captured_at     TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_tx_asset_id ON transactions_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_tx_source ON transactions_history(source);
CREATE INDEX IF NOT EXISTS idx_tx_region ON transactions_history(region);
CREATE INDEX IF NOT EXISTS idx_tx_deal_date ON transactions_history(deal_date);
CREATE INDEX IF NOT EXISTS idx_tx_lnglat ON transactions_history(lng, lat);

-- ------------------------------------------------------------
-- 6. POI 周边配套数据表（高德 POI）
--    对应前端类型：AssetAiFeatures.poi（src/types/index.ts）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poi_data (
  id              TEXT PRIMARY KEY,
  source          TEXT DEFAULT 'amap',
  source_id       TEXT,                           -- 高德 POI ID
  name            TEXT NOT NULL,                  -- POI 名称
  category        TEXT NOT NULL,                  -- metro | bus | school | hospital | shopping | park | bank | restaurant
  sub_type        TEXT,                           -- 细分类型（如地铁站/公交站/三甲医院）
  region          TEXT,
  address         TEXT,
  lng             REAL,
  lat             REAL,
  asset_id        TEXT,                           -- 关联资产 ID（若为按资产半径抓取）
  distance_to_asset_m REAL,                       -- 距关联资产距离 m
  rating          REAL,                           -- 评分
  business_hours  TEXT,
  phone           TEXT,
  raw_json        TEXT,
  captured_at     TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_category ON poi_data(category);
CREATE INDEX IF NOT EXISTS idx_poi_asset_id ON poi_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_poi_lnglat ON poi_data(lng, lat);
CREATE INDEX IF NOT EXISTS idx_poi_region ON poi_data(region);

-- ------------------------------------------------------------
-- 7. 政府公开数据表（规划/土地出让/政策文件）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS government_data (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,                  -- gov_beijing | gov_shanghai | natural_resource_bureau | planning_bureau
  source_id       TEXT,
  data_type       TEXT NOT NULL,                  -- land_auction | planning | zoning | policy | demolition
  title           TEXT NOT NULL,
  region          TEXT,
  publish_date    TEXT,                           -- 发布日期
  effective_date  TEXT,                           -- 生效日期
  content         TEXT,                           -- 主要内容摘要
  doc_url         TEXT,                           -- 原文链接
  related_asset_ids TEXT,                         -- 关联资产 ID 列表（JSON 数组）
  raw_json        TEXT,
  captured_at     TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_gov_source ON government_data(source);
CREATE INDEX IF NOT EXISTS idx_gov_data_type ON government_data(data_type);
CREATE INDEX IF NOT EXISTS idx_gov_region ON government_data(region);
CREATE INDEX IF NOT EXISTS idx_gov_publish_date ON government_data(publish_date);

-- ------------------------------------------------------------
-- 8. 资产主表（与前端 mock 对齐，可选持久化）
--    对应前端类型：Asset（src/types/index.ts）
--    用于：从 mock 迁移到真实数据后的主存储
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  address         TEXT,
  lng             REAL,
  lat             REAL,
  area            REAL,                           -- 面积 ㎡
  status          TEXT,                           -- vacant | leased | renovating
  days_vacant     INTEGER,
  type            TEXT,                           -- 业态
  estimated_price REAL,                           -- 估值 元/㎡·天
  monthly_rent    REAL,
  occupancy_rate  REAL,
  confidence      REAL,                           -- 估值置信度 0~1
  region          TEXT,
  received_batch  TEXT,
  certificate_status TEXT,                        -- complete | pending | missing
  decoration_level TEXT,
  last_renovation INTEGER,
  default_free_rent_days INTEGER,
  hidden_risks    TEXT,                           -- JSON 数组
  features_json   TEXT,                           -- { subway_distance, condition_score }
  ai_features_json TEXT,                          -- AssetAiFeatures 完整 JSON
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assets_region ON assets(region);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_lnglat ON assets(lng, lat);

-- ------------------------------------------------------------
-- 9. 资产-竞品关联表（一个资产周边的竞品映射）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_competitor_map (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id        TEXT NOT NULL,
  competitor_id   TEXT NOT NULL,
  distance_m      REAL,                           -- 资产到竞品的距离 m
  similarity_score REAL,                          -- 相似度 0~1（业态/价格/面积等综合）
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (competitor_id) REFERENCES competitor_listings(id) ON DELETE CASCADE,
  UNIQUE(asset_id, competitor_id)
);

CREATE INDEX IF NOT EXISTS idx_acm_asset_id ON asset_competitor_map(asset_id);
CREATE INDEX IF NOT EXISTS idx_acm_competitor_id ON asset_competitor_map(competitor_id);

-- ------------------------------------------------------------
-- 视图：爬虫任务最近一次运行状态
-- ------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_crawl_task_latest AS
SELECT
  t.*,
  l.started_at      AS last_log_started_at,
  l.finished_at     AS last_log_finished_at,
  l.status          AS last_log_status,
  l.records_fetched AS last_log_records_fetched,
  l.records_saved   AS last_log_records_saved,
  l.error_message   AS last_log_error
FROM crawl_tasks t
LEFT JOIN (
  SELECT task_id, MAX(started_at) AS max_started
  FROM crawl_logs
  GROUP BY task_id
) m ON m.task_id = t.id
LEFT JOIN crawl_logs l
  ON l.task_id = t.id AND l.started_at = m.max_started;

-- ------------------------------------------------------------
-- 10. Hedonic 定价模型表（训练好的系数持久化）
--     前端「新资产估价录入」页面由此拉取模型系数
--     支持通过 PUT /api/models/hedonic/:method 写入真实训练结果
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hedonic_models (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  method                 TEXT NOT NULL UNIQUE,   -- comparative | historical
  name                   TEXT,                    -- 模型展示名
  intercept              REAL,                   -- β0
  coefficients_json      TEXT,                   -- { feature: βi }
  feature_means_json     TEXT,                   -- { feature: μi }
  feature_importance_json TEXT,                  -- { feature: 重要性 }
  base_score             REAL,                   -- exp(β0 + Σ βi·μi) 基准价
  r2                     REAL,
  updated_at             TEXT DEFAULT (datetime('now'))
);
