# 项目长期记忆

## 项目概览
- 项目：XX地产 · 租金地图评估系统（RTAssetValuation），React18+TS+Vite + 高德 AMap + Zustand + SQLite/Express 后端。
- 定位：以 GIS 地图为核心的可解释租金估价工作台（Hedonic + SHAP，非黑盒）。

## 业务主流程（顶部 ProcessFlowBanner 固化）
1. 数据采集 `/intel` → 2. 资产建模 `/modeling-intro` → 3. 尽调工作台 `/due-diligence` → 4. 智能定价 `/valuation/new`
- 中枢：全域资产 GIS 地图 `/`（Dashboard，统一入口）；详情钻取 `/asset/:id`（定价+报告+竞品对标收敛视图）。
- 关键数字：225 资产 / 325 竞品 / 876 历史成交 / 26 POI / Hedonic comparative R²≈0.89。

## 已交付物
- `/Users/johnson/CodeBuddy/RTAssetValuation/system-intro.html`：按业务主流程串联 5 大核心页面的系统介绍（关键功能页面 UI 还原为 HTML 示意），供产品/业务评审。

## 分支状态（2026-07-31）
- 当前工作分支 `rtdemo`（跟踪 `origin/main`）。为给客户部署做功能删减，已从 `rtdemo` 工作区**删除全部尽调工作台**（页面/组件/数据/类型/store/路由/流程条阶段），并同步更新 README 与 system-intro。**`main` 分支未改动，仍含全部尽调文件**，切回即可恢复。
- 业务主流程默认 4 阶段（含尽调）；`rtdemo` 现为 3 阶段（数据采集→资产建模→智能定价）。
