# XX地产 · 租金地图评估系统

**面向业务团队 review 的资产盘点 / 竞品对标 / 智能估价 / 报告生成一体工作台**，以 GIS 地图为核心交互载体。

> 状态：**全功能可运行系统（rtdemo 客户交付版）** —— 数据采集 / 资产建模 / 智能定价 主线全部可用；内置 **SQLite + Express 数据后端**（225 资产 / 325 竞品 / 876 历史成交 / 26 POI 已全量入库）；Hedonic 对数线性回归估值模型；高德 AMap JS API v2.0 地图；**新资产估价录入 / 建模介绍** 页面；**移动端响应式适配（≤768px 自动切换）**。
> 注：本分支（`rtdemo`）为给客户演示做的**功能删减版**，已移除「尽职调查工作流」（页面 / 组件 / 数据 / 类型 / store / 路由 / 流程条阶段）。需完整版请切回 `main` 分支。
> 待接入：真实 BFF 联调、NFR §5 信创部署（麒麟 OS 镜像已就绪）、爬虫调度 Airflow。

---

## 目录

- [核心能力（业务主线 + 模块）](#核心能力业务主线--模块)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [路由](#路由)
- [高德地图配置](#高德地图配置)
- [数据规模切换](#数据规模切换)
- [定价模型：Hedonic 对数线性回归](#定价模型hedonic-对数线性回归)
- [模型训练与增训（Hedonic 训练 Tab）](#模型训练与增训hedonic-训练-tab)
- [AI 建模特征（12 组）](#ai-建模特征12-组81-字段)
- [移动端适配](#移动端适配)
- [项目演进历程](#项目演进历程)
- [后续扩展方向](#后续扩展方向)
- [部署（Docker 离线交付）](#部署docker-离线交付)

---

## 核心能力（业务主线 + 模块）

按业务主流程，本系统围绕「**数据采集 → 资产建模 → 智能定价**」三条主线展开（顶部 `ProcessFlowBanner` 固定展示）：

| 主线 | 阶段 | 关键能力 | 入口 |
|---|---|---|---|
| 数据采集 | M4 | 爬虫任务管理（6 mock 条）+ 新建任务 + 4 源（贝壳/58/房天下/链家）+ POI 1km 统计 + OCR 评估报告 + 人工调研数据 | `/intel` |
| 资产建模 | M8 | Hedonic 特征价格法原理、特征维度、贡献分解说明页；**模型训练 Tab**（上传 Excel 增训 + 行内新增训练数据 + 一键重训） | `/modeling-intro` |
| 智能定价 | M1/M2/M6 | 全域 GIS 地图估价 + 资产详情钻取 + 新资产估价录入 | `/` `/asset/:id` `/valuation/new` |

> `rtdemo` 分支已移除原「尽职调查」主线（M7）。完整 4 主线版本请见 `main` 分支。

**支撑模块**：

| # | 模块 | 关键能力 | 入口 |
|---|---|---|---|
| **M1** | 全域资产 GIS | 25/200 marker 渲染 + 形态分（圆/方/菱 × 红/绿/黄）+ 5 项聚合统计 + 业态/批次/区域图层控制 + 宏观图层（地铁/商圈/热力） | `/` |
| **M2** | 资产详情钻取 | 画像卡 + AI 特征 10 组 + 双方法定价（市场比较法 / 历史数据法 · Hedonic 回归）+ 公式溯源 SHAP（含中英对照）+ 竞品对标（左右并列 + 双端联动 + InfoWindow 浮层）+ 合规审查 | `/asset/:id` |
| **M3** | AI 报告工场 | 一键生成《租金评估建议书》HTML + 八项合规审查评分 + 浏览器原生 `window.print()` 导出 PDF | 详情页 → "生成报告" |
| **M6** | 新资产估价录入 | 录入新资产特征 → 调 Hedonic 模型 → 自动检索周边竞品 → 输出建议日租金(中心+区间)+SHAP 贡献+置信度 | `/valuation/new` |
| **M5** | 非标破冰 | 自动判定非标资产 + 残值/运输系数人工 slider + 4 个最相似案例下钻 + 参考区间（不给硬数字） | 详情页（仅极端非标资产可见） |

---

## 技术栈

| 类别 | 技术 |
|---|---|
| 视图层 | React 18 + TypeScript + Vite 5 |
| UI | Ant Design v5 |
| 样式 | Tailwind CSS v3（禁用 preflight，避免与 antd 全局样式冲突） |
| 状态 | Zustand 4（单一 store，含 `selectedAssetId` / `selectedCompetitorId` / `hovered*` / 等共享字段） |
| 图表 | Recharts（雷达/柱状/趋势） |
| 地图 | **高德 AMap JS API v2.0**（默认，无需 token 也能跑通） |
| AI 模型 | **Hedonic 对数线性回归（手写 JS inference）**—— 对数价格 + 特征系数 + 偏效应贡献 |
| 数据 | 静态 JSON mocks + 运行时程序化生成（`src/utils/extendedMockGenerator.ts`） |
| **数据后端** | **SQLite + Express**（`server/`），存储爬取的外部数据 |
| 错误捕获 | `ErrorBoundary` 包裹根 → 渲染错显式展示 |

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动 dev server（http://localhost:5173）
npm run dev

# 仅类型检查
npm run lint

# 类型检查 + 生产构建
npm run build

# 预览构建产物
npm run preview
```

**最低配置**：Node.js 18+。

**可选配置**：高德地图 Key（无 Key 也能跑，会显示申请引导面板）。

---

## 项目结构

```
src/
├── main.tsx                              # 入口（含 ErrorBoundary）
├── App.tsx                               # 路由：/ /asset/:id /intel
├── index.css                             # Tailwind base + 全局
│
├── types/
│   └── index.ts                          # 60+ 类型定义（含 AssetAiFeatures 10 组）
│
├── stores/
│   └── assetStore.ts                     # Zustand 单一 store（40+ 字段、15+ actions）
│
├── hooks/
│   └── useIsMobile.ts                    # 移动端判定（antd Grid.useBreakpoint，≤768px 为移动端）
│
├── mocks/
│   ├── assets.json                       # 25 条（小数据集）
│   ├── competitors.json                  # 25 条
│   ├── valuation_logic.json              # 6 因子 + 双方法配置
│   ├── poi.json                          # 地铁/商圈/热力
│   └── crawler_tasks.json                # 6 条爬虫任务
│
├── utils/
│   ├── amapEngine.ts                     # AMap Loader（带缓存、安全密钥）
│   ├── aiFeaturesMock.ts                 # 25 条 mock 资产 ai_features 自动补齐
│   ├── extendedMockGenerator.ts          # ★ 200 资产 + 300 竞品生成器（真实坐标池）
│   ├── hedonicModel.ts                   # ★ Hedonic 对数线性回归 + FEATURE_META
│   ├── pricingModels.ts                   # 双方法定价（comparable / historical）
│   ├── valuation.ts                      # 工程工具 + 报告合规检查
│   ├── scoring.ts                        # 雷达/相似度计算
│   ├── similarCases.ts                   # 非标破冰
│   ├── report.ts                         # 合规 8 项 + 报告章节
│   ├── geo.ts                            # Haversine / bbox / 圆 polygon
│   ├── competitorScoring.ts              # 竞品 4 维评分稳定派生
│   └── shap.ts                           # SHAP 风格汇总
│
├── components/
│   ├── common/
│   │   ├── ErrorBoundary.tsx             # 全局错误捕获 → 红色 Alert
│   │   ├── RiskTag.tsx
│   │   ├── HiddenRiskTag.tsx
│   │   └── PhotoGallery.tsx
│   ├── map/
│   │   ├── MapView.tsx                   # 顶层壳，仅返回 AmapMapView
│   │   ├── AmapMapView.tsx               # ★ 唯一地图组件（callback ref + 自治 effect）
│   │   ├── AssetMarker.tsx               # 形态分（圆/方/菱）+ 颜色 5 桶 + label
│   │   ├── RegionAggregateLayer.tsx      # 区域聚合层
│   │   ├── RadiusCircle.tsx              # GeoJSON 圆覆盖层
│   │   ├── CompetitorMarker.tsx          # 竞品三角点
│   │   ├── PoiLayer.tsx                  # 地铁/商圈/热力
│   │   └── HeatLegend.tsx                # 左下图例
│   ├── dashboard/
│   │   ├── StatBar.tsx                   # 5 项聚合统计
│   │   └── LayerControlPanel.tsx         # 用户/业态/批次/聚合/规模/POI 控制
│   ├── detail/
│   │   ├── AssetPortraitCard.tsx         # 画像 + 基础信息 + 风险标签
│   │   ├── AiFeaturesCard.tsx            # ★ AI 特征 10 组（PRD §3/§4）
│   │   ├── ValuationPanel.tsx            # 智能定价面板 + 双方法勾选器
│   │   ├── FormulaModal.tsx              # 推导过程（SHAP 中英对照）
│   │   ├── CompetitionRadar.tsx          # ★ 竞品对标 + 双端联动 + AI 特征面板
│   │   └── SimilarCasesPanel.tsx         # 非标破冰（相似案例 + 残值/运输 slider）
│   ├── report/
│   │   ├── ReportPreview.tsx             # ★ 完整 HTML 报告 Drawer
│   │   └── ComplianceStrip.tsx           # 合规 8 项评分
│   └── intel/
│       ├── CrawlerPanel.tsx              # 爬虫任务管理表
│       └── NewCrawlerTaskDrawer.tsx      # 新建任务抽屉
│
└── pages/
    ├── HomePage.tsx                      # Dashboard（顶部 StatBar + 右侧 Sidebar + 全屏地图）
    ├── AssetDetailPage.tsx               # 详情（结论先行：头部+画像 → 左[地图+竞品对标]/右[结论+支撑特征]）
    ├── IntelPage.tsx                     # 情报站（/intel 爬虫任务管理）
    ├── NewAssetValuationPage.tsx         # 新资产估价录入（/valuation/new）
    └── ModelingIntroPage.tsx             # 建模介绍（/modeling-intro）
```

---

## 路由

| 路径 | 页面 |
|---|---|
| `/` | Dashboard HomePage（225 资产 + 5 聚合统计 + 业态/批次/POI 控件 + 业务主流程条） |
| `/asset/:id` | AssetDetailPage（结论先行：智能定价 + AI 特征 + 报告 Drawer + 竞品对标） |
| `/valuation/new` | NewAssetValuationPage（新资产估价录入：周边竞品检索 + Hedonic 测算 + SHAP） |
| `/intel` | IntelPage（爬虫任务管理 + 新建任务） |
| `/modeling-intro` | ModelingIntroPage（Hedonic 模型说明 + 模型训练 Tab） |
| `*` | 重定向到 `/` |

> `rtdemo` 分支已移除 `/due-diligence` 尽职调查页及相关路由。

---

## 高德地图配置

项目**统一使用高德地图（AMap JS API v2.0）**。

### 配置 `.env`

```bash
VITE_AMAP_KEY=你的高德Web端JS API Key
# 可选：若启用了安全密钥
VITE_AMAP_SECURITY=你的安全码
```

申请地址：https://lbs.amap.com/api/jsapi-v2/guide/abc/prepare

> - **未配置 Key 时**：地图区域显示友好提示面板（附申请链接 + `.env` 示例），不阻塞其他功能。
> - **控制台域名白名单**：在「高德开放平台 → 我的应用」中需添加 `localhost` / `127.0.0.1`（开发阶段可写 `*`）。

### 架构要点

- `src/utils/amapEngine.ts` — AMap Loader（带缓存、注入安全密钥）
- `src/components/map/AmapMapView.tsx` — 唯一地图组件
  - **callback ref + useRef** 同步拿到 DOM（避开 useState 异步陷阱）
  - 每个 useEffect 完全自治（markers / 覆盖层 / POI 各自维护 `created[]`）
  - `safeRemove` / `safeDestroy` 兜底 AMap.destroy() 后的二次清理

---

## 数据集（已合并为统一规模）

前端 `assetStore.loadAll()` **固定合并**两套数据源，提供统一的真实分布数据集，不再提供规模切换：

- **资产 225 条**：手写 25 条（`assets.json`，ID `RZ-2023-xxx`）+ 程序化生成 200 条（`RT-xxxx`），每条含 12 组 AI 特征
- **竞品 325 条**：手写 25 条（`C-xxx`）+ 程序化生成 300 条（`C-xxxx`）
- **历史成交 876 条**：每条资产 2–7 笔，覆盖 2019–2026
- **POI 26 条**：地铁站 / 商圈 / 热力点

> ID 前缀区分（手写 `RZ-/C-` 与生成 `RT-/C-`）保证无冲突。Sidebar「图层」tab 的「数据规模」区现为**只读说明**，展示已加载数量。

**200 条生成资产的真实坐标池**（90+ 真实北京/上海点位）：
- 北京（55+）：国贸 CBD / 望京 / 中关村 / 西二旗 / 金融街 / 丽泽 / 亦庄等
- 上海（35+）：陆家嘴 / 张江高科 / 徐家汇 / 静安寺 / 人民广场 / 虹桥等
- 其他（6）：深圳福田 / 广州天河 / 杭州钱江新城 / 成都天府等

---

## 定价模型：Hedonic 对数线性回归

`src/utils/hedonicModel.ts` 导出训练好的 Hedonic 回归模型（与后端 `hedonic_models` 表结构一致）：

```ts
interface HedonicModel {
  name: string;
  intercept: number;                          // β0
  coefficients: Record<string, number>;       // βi 系数
  feature_means: Record<string, number>;      // 各特征训练集均值（偏效应分解用）
  feature_importance: Record<string, number>; // |βi × std_i| 标准化重要性
  base_score: number;                         // exp(β0 + Σ βi·mean_i) = 基准价
  r2: number;
}
```

| 方法 | 输入维度 | 算法 | R² |
|---|---|---|---|
| **市场比较法** `comparative` | 9 维：地铁距离 + 成新 + 装修 + 装修年限 + 权证 + 学区 + 商密 + CBD + 免租 | `HEDONIC_COMPARATIVE`（对数线性 + 偏效应贡献，系数由 `fit_hedonic.py` 岭回归真实拟合） | R²≈0.85（青岛 n=10 真实样本） |
| **历史数据法** `historical` | 4 维：基准价（对数）+ 装修 + 装修年限 + 免租 | `HEDONIC_HISTORICAL` | R²≈0.14（样本少，低频特征解释力有限） |

### 前端推理 vs 后端训练

- **前端手写 JS 推理**（`src/utils/hedonicModel.ts` 的 `hedonicPredict`）：用于估价页即时给出预测值与 SHAP 风格的偏效应贡献分解，零后端依赖、可解释。
- **后端独立推理** `POST /api/models/predict`：系数留在服务端不外泄，只回预测值与贡献分解（适合生产对外服务）。
- **真实训练** `server/src/scripts/fit_hedonic.py`：岭回归 + LOO-CV 选 λ，读取 `training_samples` 表全量拟合，系数写回 `hedonic_models`，前端经 `GET /api/models/hedonic/:method` 拉取即生效（详见上方「模型训练与增训」）。

> 注：浏览器无法直接加载 Python pickle；模型系数以 JSON（`coefficients_json` 等）形式在前后端间传递，结构一致。

### SHAP 风格贡献

每个贡献行返回 5 字段：

| 字段 | 含义 |
|---|---|
| `feature` | 英文特征名（Hedonic 标准） |
| `feature_cn` | ★ 中文业务名 |
| `contribution` | 贡献值（元），正=抬升价格、负=压低 |
| `explanation` | ★ 中文业务解释（合规审计用） |
| `source` | ★ 中文取值来源（自动格式化：`300m` / `8 年` / `¥4.50/㎡·天`等） |

完整逻辑见 `src/utils/hedonicModel.ts` 的 `FEATURE_META` 表。

---

## 模型训练与增训（Hedonic 训练 Tab）

入口：建模介绍页 `/modeling-intro` → 「Hedonic 模型训练」Tab。支持在不改代码的前提下，用自有数据持续迭代模型：

- **训练数据可编辑**：样本池 = 内置 10 条（青岛真实坐标，`source=builtin`）+ 上传 + 手动新增，统一存于后端 `training_samples` 表（首次启动自动 seed）。
- **功能 1 · 上传 Excel 增训**：下载模板（已派生 12 维特征矩阵）→ 填写 → 上传（SheetJS 解析 + 必填/数值校验 + 预览确认）→ 批量入库。
- **功能 2 · 行内新增训练数据**：表格「+ 新增一行」直接行内编辑 / 保存 / 删除样本（来源标签区分 内置 / 上传 / 手动）。
- **重训模型**：点「重训模型」→ 后端 `POST /api/training-samples/refit` 调 `python3 server/src/scripts/fit_hedonic.py` **全量重训**（岭回归 + LOO-CV 选 λ）→ 写回 `hedonic_models` 表 → 前端系数卡片与 R² 立即刷新（显示「重训前 → 重训后」对比）。

> ⚠️ **重训依赖运行环境具备 `python3` 与 `numpy`**：`server/Dockerfile` 的 runtime 阶段已 `apk add python3 py3-numpy` 并把 `fit_hedonic.py` 拷入镜像，因此**官方 api 镜像可直接重训**。本地 `npm run server:dev` 需自备 `python3` + `pip install numpy`，缺失时前端退回内置静态系数兜底、重训无效。
> ⚠️ 重训语义为「**全量重训含新样本**」，会整体覆盖 `hedonic_models` 系数——内置 10 条系数现在已是真实训练结果，不再是硬编码兜底。
> ⚠️ 训练样本与模型均持久化在后端 SQLite；点「重训模型」会用当前全部样本（内置 + 上传 + 手动）重拟合。

---

## AI 建模特征（12 组，81 字段）

按 PRD §3 数据需求 + §4 特征工程设计，并在迭代中合并爬虫字段、新增交易条件 / 时间特征两组：

| # | 分组 | 数据来源 | 字段数 |
|---|---|---|---|
| 1 | 基础属性 | 内部 ERP + 爬取 | 13 |
| 2 | 区位特征 | GIS + 地址 NLP | 11 |
| 3 | 物理状态 | 图像识别 + NLP | 9 |
| 4 | 历史交易 | 内部 ERP | 8 |
| 5 | 评估公司报告 (OCR) | PDF 抽取 | 4 |
| 6 | 竞品挂牌 | 爬虫：贝壳/58/房天下 | 6 |
| 7 | 流拍记录 | 内部 ERP | 3 |
| 8 | 人工调研 | 一线 App 录入 | 6 |
| 9 | POI 1km 内 | 宏观 GIS | 6 |
| 10 | 数据来源时间戳 | 各源最近同步 | 6 |
| 11 | 交易条件 | 爬虫：58/安居客 | 5 |
| 12 | 时间特征 | 禧泰 + 挂牌月度 | 3 |

UI 表现（`AiFeaturesCard`）：
- **所有分组默认平铺可见**（去除"全部塞进下拉"的反模式），核心分组整宽置顶、其余响应式两列网格；
- **标品 / 非标差异化布局**：标品优先展示区位/竞品/交易，非标优先展示人工调研/流拍/风险并高亮人工修正系数；
- 每条字段**标注数据来源** + Hedonic 模型输入标记（`hedonic` 蓝标），可被 SHAP/LIME 解释；
- 顶部「AI 综合评分」总览（0–100）+ 4 维雷达缩略 + Top3 风险点。

---

## 移动端适配

系统对 **≤768px（手机/小平板）** 做了全站响应式适配，**PC 端（>768px）布局完全不变**。

判定：`src/hooks/useIsMobile.ts` 基于 antd `Grid.useBreakpoint()`，`!screens.md`（即 <768px）视为移动端，渲染期切换布局，无新依赖。

适配要点：

| 页面 / 组件 | 移动端表现 |
|---|---|
| `ProcessFlowBanner`（顶部业务主流程） | 外层 + 阶段流水线均 `flex-wrap`，3 阶段自动换行，避免溢出被屏幕右缘裁切 |
| `StatBar` | `flex flex-wrap`，竖分隔线 `hidden md:block` |
| `HomePage` | 顶栏绝对定位浮层改为右下角 FAB（圆形按钮）+ antd `Drawer`（标题「资产概览」，宽 88%）；`right-[336px]` 让位逻辑在移动端移除 |
| `AssetDetailPage` | 外层网格切换为 `grid-cols-1` 单列滚动；地图高度适配；报告 `Drawer` 宽 `100%`；地址在手机端 `hidden` |
| `IntelPage` / `ModelingIntroPage` / `NewAssetValuationPage` | 头部 `flex flex-wrap`，改用 `md:` 断点，纯 CSS 适配 |

> 适配仅改变 ≤768px 的布局分支；所有条件渲染与 CSS 断点均通过 `useIsMobile` / Tailwind `md:` 控制，PC 端代码路径不受影响。

---

## 项目演进历程

| 阶段 | 日期 | 内容 |
|---|---|---|
| MVP | 2026-07 | 初始搭建（25 资产 + 估值详情） |
| 规范重构 | 2026-07 | 按 PRD §6-9 全量重构（业态图层、区位聚合、规范定价方法） |
| M1 | 2026-07 | 全域资产 GIS（25 资产、形态分色、5 统计、Layer 控制） |
| M2 | 2026-07 | 资产详情钻取（画像 + 竞品对标 + 智能定价） |
| M3 | 2026-07 | AI 报告工场 + 完整定价方法 + 爬虫情报站 |
| M4 | 2026-07 | 外部数据情报 + 非标破冰 + POI |
| 反馈 #5-#10 | 2026-07 | 业务团队 review 升级（225 资产合并 + Hedonic 回归 + 中文化 SHAP + 数据后端 SQLite） |
| 新功能 | 2026-07-27 | 新资产估价录入 `/valuation/new`、建模介绍 `/modeling-intro` |
| UX 重构 | 2026-07-27 | 详情页"结论先行"布局：头部 + 资产画像 → 左[地图+竞品对标] / 右[结论(定价)+支撑特征]；竞品对标与地图就近联动；消除双重滚动；结论区加可信度来源闭环 |
| 模型 & 训练 | 2026-07-28 | 「定位训练样本」地图按钮；模型训练 Tab 两功能（上传 Excel 增训 + 行内新增训练数据 + 一键重训）；后端 `training_samples` 表 + `/api/training-samples` CRUD + `refit` 端点；`fit_hedonic.py` 改为读表重训；模型系数由真实青岛样本拟合（comparative R²≈0.85 / historical R²≈0.14） |
| 移动端适配 | 2026-07-31 | 全站 ≤768px 响应式适配（基于 `useIsMobile`）：HomePage FAB+Drawer 概览、AssetDetailPage 单列、各页头部 `flex-wrap`、ProcessFlowBanner 阶段换行；PC 布局零改动 |
| 客户镜像修复 | 2026-07-31 | web 镜像固化客户 `VITE_API_BASE_URL=http://218.203.49.164:3001/api` + AMap Key；api 镜像内置 `python3`+`numpy` 修复「重训 500 spawn python3 ENOENT」；重发 `rt-asset-arm64-images.tar`（arm64） |

---

## 数据后端（SQLite + Express）

项目已内置轻量数据后端 `server/`，用于**存储爬取的外部数据**（竞品挂牌/历史成交/POI/政府数据），以及 **Hedonic 模型系数**（`hedonic_models`）与**训练样本池**（`training_samples`）。

### 数据库表结构（11 张表 + 1 视图）

| 表名 | 用途 | 对应前端类型 |
|---|---|---|
| `data_sources` | 数据源配置（贝壳/58/链家/高德/政府） | - |
| `crawl_tasks` | 爬虫任务定义与调度 | `CrawlerTask` |
| `crawl_logs` | 每次爬取运行的日志 | - |
| `competitor_listings` | 竞品挂牌数据（链家/贝壳） | `Competitor` |
| `transactions_history` | 历史成交记录 | `Transaction` |
| `poi_data` | POI 周边配套（高德） | `AssetAiFeatures.poi` |
| `government_data` | 政府公开数据（规划/土地/政策） | - |
| `assets` | 资产主表（与前端 mock 对齐） | `Asset` |
| `asset_competitor_map` | 资产-竞品关联映射 | - |
| `hedonic_models` | Hedonic 模型系数（`GET/PUT /api/models/hedonic/:method` 读写，首次启动写内置种子） | `HedonicModel` |
| `training_samples` | 训练样本池（内置 10 + 上传 + 手动），`fit_hedonic.py` 重训数据源 | - |
| `v_crawl_task_latest` | 视图：任务 + 最近一次日志 | - |

设计要点：
- 每条爬取数据保留 `raw_json` 原始字段，便于回溯
- `(source, source_id)` 唯一约束，避免重复爬取
- 支持空间半径查询（经纬度近似 Haversine）
- WAL 模式提升并发读性能

### 启动数据后端

```bash
# 1. 安装后端依赖
npm run server:install

# 2. 初始化数据库（创建表结构）
npm run server:db:init

# 3. 导入全部 mock 数据到数据库（25+200 资产 / 25+300 竞品 / 历史成交 / POI / 爬虫任务）
npm run server:db:migrate

# 4. （可选）写入少量种子数据
npm run server:db:seed

# 5. 启动后端（http://localhost:3001）
npm run server:dev

# 或前后端并发启动
npm run dev:all
```

> **mock 数据迁移**：`npm run server:db:migrate` 会将前端所有 mock 数据导入 SQLite，包括：
> - 225 条资产（25 条 `assets.json` + 200 条程序化生成，每条含 10 组 AI 特征）
> - 325 条竞品（25 条 `competitors.json` + 300 条程序化生成）
> - 876 条历史成交记录（每条资产 2-7 笔，覆盖 2019-2026）
> - 26 条 POI（地铁站点/商圈/热力点）
> - 6 条爬虫任务 + 6 条数据源配置
>
> 迁移后前端可通过 `src/api/client.ts` 调用后端 API 读取真实数据库数据。

### REST API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET/POST/PUT/DELETE | `/api/crawl-tasks` | 爬虫任务管理 |
| POST | `/api/crawl-tasks/:id/run` | 手动触发爬虫（占位） |
| GET | `/api/crawl-tasks/:id/logs` | 任务运行日志 |
| GET/POST/PUT/DELETE | `/api/competitors` | 竞品挂牌数据 |
| POST | `/api/competitors/batch` | 批量入库（爬虫写入） |
| GET/POST/DELETE | `/api/transactions` | 历史成交记录 |
| POST | `/api/transactions/batch` | 批量入库 |
| GET | `/api/poi` | POI 查询（支持空间半径） |
| GET | `/api/poi/stats/by-asset/:asset_id` | 按资产聚合 POI 统计 |
| POST | `/api/poi/batch` | 批量入库 |
| GET/POST/DELETE | `/api/government` | 政府公开数据 |
| GET/POST/PUT/DELETE | `/api/assets` | 资产主表 |
| GET/POST/PUT/DELETE | `/api/data-sources` | 数据源配置 |
| GET | `/api/stats` | 各表记录数汇总 |
| GET | `/api/stats/source-distribution` | 按数据源分布统计 |
| GET/PUT | `/api/models/hedonic/:method` | 获取/覆盖 Hedonic 模型系数（`comparative` / `historical`） |
| POST | `/api/models/predict` | 服务端独立推理（系数留后端，仅回预测值 + SHAP 贡献分解） |
| GET/POST/PUT/DELETE | `/api/training-samples` | 训练样本池 CRUD（`source`: builtin / upload / manual） |
| POST | `/api/training-samples/refit` | 触发 `python3 server/src/scripts/fit_hedonic.py` 全量重训并写回 `hedonic_models` |

> 空间查询示例：`GET /api/competitors?lng=116.4648&lat=39.9087&radius_km=3`

### 爬虫接入点

实际爬虫逻辑后续在 `server/src/scripts/crawlers/` 下实现，调用流程：
1. `POST /api/crawl-tasks/:id/run` 触发任务
2. 后端写入 `crawl_logs`（status=running）
3. 调用爬虫模块抓取数据
4. 通过 `POST /api/{competitors|transactions|poi|government}/batch` 批量入库
5. 更新 `crawl_logs`（status=success/failed, records_saved）

### 高德 POI 真实拉取（已实现）

支持两种方式拉取真实 POI 数据：

**方式 A：前端拉取（推荐，无需额外 Key）**
- 使用 AMap JS API 的 PlaceSearch 插件
- 入口：首页 → 数据情报站 → "高德 POI 真实拉取"面板
- 支持单资产/批量模式，拉取后通过后端 API 写入 `poi_data` 表
- 6 类 POI：地铁站 / 公交站 / 学校 / 医院 / 购物中心 / 公园

**方式 B：后端爬虫（需 Web 服务 Key）**
- 调用高德 Web 服务 API（`restapi.amap.com/v3/place/around`）
- 命令行：`npm run crawl:poi -- --asset=RZ-2023-003`（单资产）或 `--limit=50`（批量）
- 需要在 `server/.env` 配置 `AMAP_API_KEY`（Web 服务类型 key，与 JS API key 不同）
- 申请地址：https://lbs.amap.com/api/webservice/guide/create-project/get-key

---

## 后续扩展方向

按 PRD §5 NFR：

- **爬虫调度**：Airflow + scrapy（当前为手动触发占位）
- **真实 AI**：Hedonic 模型服务化（XGBoost / LightGBM 备选）+ Few-shot 微调（PyTorch）
- **OCR/NLP**：PaddleOCR + HanLP（合同条款抽取）
- **权限分级**：一线只能看本区域；总部可看全貌
- **打印/PDF**：从 `window.print()` 升级到 jsPDF + 章骑缝
- **离线部署**：麒麟 OS 容器镜像
- **数据库迁移**：数据量增大后可平滑迁移至 PostgreSQL+PostGIS（表结构兼容）

---

## 部署（Docker 离线交付）

> 详细步骤见 `DEPLOY.md`。本段给出概览。

交付物 `rt-asset-arm64-images.tar`（arm64 专用）含两个镜像：

| 镜像 | 作用 |
|---|---|
| `rt-asset-valuation-web:latest` | 前端 Nginx 静态站点，**自带全部 225 资产演示数据** |
| `rt-asset-valuation-api:latest` | 后端 Express + SQLite（情报站/爬虫落库 + Hedonic 重训，已内置 python3+numpy） |

> **关键事实**：核心估价数据在构建时已打包进 web 镜像，**只跑 web 一个容器即可完整演示估价系统**，无需后端、无需数据库初始化。

### A. 传统 npm（开发）

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # dist/ 静态产物
```

### B. 离线镜像部署（推荐给客户 / 内网）

```bash
# 加载镜像（arm64 服务器）
docker load -i rt-asset-arm64-images.tar

# 最简部署：仅前端，覆盖全部估价演示
docker run -d --name rt-web --restart unless-stopped -p 80:80 \
  rt-asset-valuation-web:latest

# 全栈部署（含后端，引用已加载镜像，不现场构建）
docker compose -f docker-compose.prod.yml up -d
```

- web 健康检查：`curl http://<IP>/healthz` → `ok`
- 访问：`http://<IP>/`

### Web 镜像构建要点

`Dockerfile` multi-stage：`node:20-alpine` 构建 → `nginx:1.27-alpine` 托管 `dist/`。以下值在**构建期**内联进 bundle：

```bash
docker build --platform linux/arm64 -t rt-asset-valuation-web:latest \
  --build-arg VITE_AMAP_KEY=<Key> \
  --build-arg VITE_AMAP_SECURITY=<安全密钥> \
  --build-arg VITE_API_BASE_URL=http://<客户主机IP>:3001/api .
```

- **后端地址固化**：`VITE_API_BASE_URL` 仅在「浏览器与后端同机」时默认 `localhost:3001/api` 有效；跨机访问需带上真实地址重新构建。
- **高德 Key 白名单**：镜像内 Key 的 Referer 白名单须加入客户访问域名/IP，否则地图瓦片被拦截。
- **SPA fallback / 静态资源 immutable / gzip / 健康检查 `/healthz`** 等由 nginx 配置处理（见 `nginx.conf`）。

### API 镜像要点

`server/Dockerfile` runtime 阶段已 `apk add python3 py3-numpy` 并把 `fit_hedonic.py` 拷入镜像，故官方 api 镜像**开箱即可重训**（不再报 `spawn python3 ENOENT`）。SQLite 经 `-v rt-asset-db:/app/data` 持久化。

> 镜像为 **arm64 专用**，x86_64 主机报 `exec format error`；需 x86 版本请另行 `docker buildx build --platform linux/amd64`。

---

## 关键设计决策

1. **国企合规优先**：UI 明确标"使用 {方法}"、5 选 2 勾选器、附件清单、口径审计可追。
2. **非标给参考区间**：不要 AI 硬算数字，让一线 + 残值/运输系数人工修正。
3. **AI 特征 schema 对齐**：资产 `ai_features` 与竞品 `scores` 同 4 轴名（交通/配套/房龄/价格），Hedonic 输入 schema 严格一致。
4. **callback ref > useState for DOM**：避开 useState 异步陷阱（关键反模式 #5）。
5. **每个 useEffect 自治**：markers / 覆盖层 / 浮层都有自己的 `created[]`，cleanup 只清理自己（关键反模式 #3, #9）。
