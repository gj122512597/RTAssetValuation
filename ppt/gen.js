const pptxgen = require("pptxgenjs");
const path = require("path");

const pptx = new pptxgen();
pptx.defineLayout({ name: "W", width: 13.33, height: 7.5 });
pptx.layout = "W";

const SHOT = path.resolve(__dirname, "shots");
const NAVY = "1E2761";
const INK = "1F2937";
const LIGHT = "F4F6FB";
const ACCENT = "0EA5E9";
const ACCENT2 = "14B8A6";
const WHITE = "FFFFFF";
const MUTED = "6B7280";
const FONT = "Microsoft YaHei";

// 标题带（内容页顶部）
function titleBar(slide, text, kicker) {
  slide.background = { color: LIGHT };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.15, fill: { color: NAVY } });
  if (kicker) {
    slide.addText(kicker, { x: 0.6, y: 0.18, w: 12, h: 0.3, fontSize: 12, color: ACCENT, fontFace: FONT, bold: true, charSpacing: 2 });
  }
  slide.addText(text, { x: 0.6, y: 0.42, w: 12.1, h: 0.6, fontSize: 26, color: WHITE, fontFace: FONT, bold: true });
}

function shotSlide(text, kicker, img, caption) {
  const s = pptx.addSlide();
  titleBar(s, text, kicker);
  s.addImage({ path: path.join(SHOT, img), x: 1.86, y: 1.3, w: 9.6, h: 6.0 });
  if (caption) {
    s.addText(caption, { x: 1.86, y: 7.28, w: 9.6, h: 0.22, fontSize: 10, color: MUTED, fontFace: FONT, align: "center" });
  }
  return s;
}

function darkSlide() {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  return s;
}

// ---------- 1. 封面 ----------
{
  const s = darkSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0.9, y: 2.35, w: 0.12, h: 2.2, fill: { color: ACCENT } });
  s.addText("AI 辅助资产估值与尽调平台", { x: 1.2, y: 2.3, w: 11, h: 1.0, fontSize: 40, bold: true, color: WHITE, fontFace: FONT });
  s.addText("面向资管 · 投决 · 尽调团队的智能估值系统", { x: 1.2, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: "CADCFC", fontFace: FONT });
  s.addText("客户汇报  |  项目介绍  |  2026.07", { x: 1.2, y: 6.4, w: 11, h: 0.4, fontSize: 13, color: "94A3B8", fontFace: FONT });
}

// ---------- 2. 目录 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "目录", "AGENDA");
  const items = [
    ["一", "项目是什么", "产品定位 · 技术架构 · 能力图谱"],
    ["二", "主业务流和使用方法", "典型场景 · 端到端流程 · 页面操作"],
    ["三", "算法建模与数据", "数据底座 · AI 特征 · Hedonic 模型与 SHAP"],
  ];
  items.forEach((it, i) => {
    const y = 1.7 + i * 1.55;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y, w: 11.5, h: 1.25, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 1.15, y: y + 0.27, w: 0.7, h: 0.7, fill: { color: NAVY } });
    s.addText(it[0], { x: 1.15, y: y + 0.27, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: FONT });
    s.addText(it[1], { x: 2.2, y: y + 0.18, w: 10, h: 0.5, fontSize: 20, bold: true, color: INK, fontFace: FONT });
    s.addText(it[2], { x: 2.2, y: y + 0.68, w: 10, h: 0.4, fontSize: 13, color: MUTED, fontFace: FONT });
  });
}

// ---------- 3. 章节一封面 ----------
{
  const s = darkSlide();
  s.addText("PART 01", { x: 1.0, y: 2.6, w: 11, h: 0.4, fontSize: 14, color: ACCENT, bold: true, charSpacing: 3, fontFace: FONT });
  s.addText("项目是什么", { x: 1.0, y: 3.0, w: 11, h: 1.0, fontSize: 44, bold: true, color: WHITE, fontFace: FONT });
  s.addText("定位 · 技术架构 · 能力图谱", { x: 1.0, y: 4.1, w: 11, h: 0.5, fontSize: 16, color: "CADCFC", fontFace: FONT });
}

// ---------- 4. 定位与价值 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "产品定位与核心价值", "WHAT IS IT");
  s.addText("一句话定位", { x: 0.9, y: 1.5, w: 5, h: 0.4, fontSize: 14, bold: true, color: ACCENT2, fontFace: FONT });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 1.95, w: 11.5, h: 1.1, fill: { color: NAVY } });
  s.addText("面向资管 / 投决 / 尽调团队的 AI 辅助资产估值与尽调平台", { x: 1.2, y: 1.95, w: 11, h: 1.1, fontSize: 20, bold: true, color: WHITE, valign: "middle", fontFace: FONT });
  const cards = [
    ["结论先行", "资产定价结果置顶展示，下方为特征支撑证据链"],
    ["证据可追溯", "每个定价结论可下钻到原始字段与数据来源"],
    ["非黑盒", "Hedonic 回归方法学明示 + SHAP 贡献分解"],
  ];
  cards.forEach((c, i) => {
    const x = 0.9 + i * 3.9;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 3.4, w: 3.7, h: 2.9, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.25, y: 3.65, w: 0.55, h: 0.55, fill: { color: ACCENT } });
    s.addText(String(i + 1), { x: x + 0.25, y: 3.65, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: FONT });
    s.addText(c[0], { x: x + 0.25, y: 4.35, w: 3.2, h: 0.5, fontSize: 17, bold: true, color: INK, fontFace: FONT });
    s.addText(c[1], { x: x + 0.25, y: 4.9, w: 3.2, h: 1.2, fontSize: 13, color: MUTED, fontFace: FONT });
  });
}

// ---------- 5. 痛点 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "解决什么业务痛点", "PAIN POINTS");
  const pains = [
    ["估值靠人工", "传统评估周期长、口径不一、过程不可追溯"],
    ["数据孤岛", "竞品 / 成交 / POI 散落爬虫与内部 ERP，无结构化沉淀"],
    ["非标无框架", "极端非标资产缺乏参考区间，易拍脑袋决策"],
  ];
  pains.forEach((p, i) => {
    const x = 0.9 + i * 3.9;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.7, w: 3.7, h: 4.4, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.7, w: 3.7, h: 0.14, fill: { color: "EF4444" } });
    s.addText("✕", { x: x + 0.25, y: 2.0, w: 0.8, h: 0.8, fontSize: 30, bold: true, color: "EF4444", fontFace: FONT });
    s.addText(p[0], { x: x + 0.25, y: 2.95, w: 3.2, h: 0.5, fontSize: 18, bold: true, color: INK, fontFace: FONT });
    s.addText(p[1], { x: x + 0.25, y: 3.5, w: 3.2, h: 2.0, fontSize: 13, color: MUTED, fontFace: FONT });
  });
}

// ---------- 6. 技术架构 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "技术架构", "ARCHITECTURE");
  const layers = [
    ["交互展示层", "React 18 + TypeScript + 高德 AMap JS API + Antd + Recharts", ACCENT],
    ["数据后端", "SQLite + Express（端口 3001）—— 爬取的竞品 / 成交 / POI 全量入库", ACCENT2],
    ["算法模型层", "Hedonic 对数线性回归（内置训练系数）+ SHAP 解释器", NAVY],
  ];
  layers.forEach((l, i) => {
    const y = 1.7 + i * 1.55;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y, w: 11.5, h: 1.3, fill: { color: WHITE }, line: { color: l[2], width: 1.5 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.9, y, w: 0.18, h: 1.3, fill: { color: l[2] } });
    s.addText(l[0], { x: 1.3, y: y + 0.2, w: 3.2, h: 0.9, fontSize: 18, bold: true, color: l[2], valign: "middle", fontFace: FONT });
    s.addText(l[1], { x: 4.6, y: y + 0.2, w: 7.5, h: 0.9, fontSize: 13, color: INK, valign: "middle", fontFace: FONT });
  });
}

// ---------- 7. 能力图谱 8 模块 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "核心能力图谱（8 大模块）", "CAPABILITIES");
  const mods = [
    ["M1", "资产地图", "空间分布 + 图层筛选"],
    ["M2", "智能定价", "结论先行 + 方法论"],
    ["M3", "竞品对标", "双向联动 + 雷达"],
    ["M4", "AI 建模特征", "12 组 81 字段"],
    ["M5", "非标破冰", "参考区间 + 案例"],
    ["M6", "新资产估价录入", "周边检索 + 测算"],
    ["M7", "尽职调查中心", "任务 + 下钻"],
    ["M8", "建模介绍", "原理说明页"],
  ];
  mods.forEach((m, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.9 + col * 2.95, y = 1.65 + row * 2.45;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.75, h: 2.2, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.25, y: y + 0.25, w: 0.95, h: 0.5, fill: { color: NAVY } });
    s.addText(m[0], { x: x + 0.25, y: y + 0.25, w: 0.95, h: 0.5, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: FONT });
    s.addText(m[1], { x: x + 0.25, y: y + 0.85, w: 2.3, h: 0.5, fontSize: 14, bold: true, color: INK, fontFace: FONT });
    s.addText(m[2], { x: x + 0.25, y: y + 1.35, w: 2.3, h: 0.7, fontSize: 11, color: MUTED, fontFace: FONT });
  });
}

// ---------- 8. 章节二封面 ----------
{
  const s = darkSlide();
  s.addText("PART 02", { x: 1.0, y: 2.6, w: 11, h: 0.4, fontSize: 14, color: ACCENT, bold: true, charSpacing: 3, fontFace: FONT });
  s.addText("主业务流和使用方法", { x: 1.0, y: 3.0, w: 11, h: 1.0, fontSize: 40, bold: true, color: WHITE, fontFace: FONT });
  s.addText("典型场景 · 端到端流程 · 页面操作", { x: 1.0, y: 4.05, w: 11, h: 0.5, fontSize: 16, color: "CADCFC", fontFace: FONT });
}

// ---------- 9. 用户与场景 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "三类典型用户与入口", "USER SCENARIOS");
  const users = [
    ["投决 / 资管", "资产地图找标的 → 进详情看定价与支撑", "→ 资产地图 / 资产详情"],
    ["估值师", "录入新资产特征 → 一键出建议日租金", "→ 新资产估价录入"],
    ["风控 / 尽调", "尽调中心建单 → 资产接收下钻", "→ 尽职调查中心"],
  ];
  users.forEach((u, i) => {
    const y = 1.7 + i * 1.55;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y, w: 11.5, h: 1.3, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 1.2, y: y + 0.3, w: 0.7, h: 0.7, fill: { color: ACCENT2 } });
    s.addText(String(i + 1), { x: 1.2, y: y + 0.3, w: 0.7, h: 0.7, fontSize: 20, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: FONT });
    s.addText(u[0], { x: 2.2, y: y + 0.2, w: 3.0, h: 0.9, fontSize: 18, bold: true, color: INK, valign: "middle", fontFace: FONT });
    s.addText(u[1], { x: 5.2, y: y + 0.2, w: 5.0, h: 0.9, fontSize: 13, color: MUTED, valign: "middle", fontFace: FONT });
    s.addText(u[2], { x: 10.2, y: y + 0.2, w: 2.0, h: 0.9, fontSize: 11, bold: true, color: ACCENT, valign: "middle", fontFace: FONT });
  });
}

// ---------- 10. 业务流程 + Dashboard 截图 ----------
shotSlide("端到端主业务流程", "BUSINESS FLOW", "01_dashboard.png",
  "资产地图：225 资产 / 325 竞品 / 876 历史成交 / 26 POI 空间分布与图层筛选");

// ---------- 11. 详情结论先行 ----------
shotSlide("资产详情：结论先行", "ASSET DETAIL", "02_detail_top.png",
  "头部 + 资产画像 → 左[地图 + 竞品对标] / 右[结论(定价) + 支撑特征]，整页单一滚动");

// ---------- 12. 竞品对标联动 ----------
shotSlide("竞品对标：与地图双向联动", "COMPETITION", "03_detail_comp.png",
  "点 / hover 竞品行 ↔ 地图飞行高亮，空间就近陈列，联动可见");

// ---------- 13. 新资产估价录入 ----------
shotSlide("新资产估价录入", "NEW ASSET", "05_new_valuation.png",
  "录入特征 → 周边竞品检索 → 建议日租金(中心 + 区间) + SHAP 贡献 + 置信度");

// ---------- 14. 尽职调查中心 ----------
shotSlide("尽职调查中心", "DUE DILIGENCE", "06_due_diligence.png",
  "尽调任务管理 + 新建尽调单 + 资产接收 intake 下钻");

// ---------- 15. 章节三封面 ----------
{
  const s = darkSlide();
  s.addText("PART 03", { x: 1.0, y: 2.6, w: 11, h: 0.4, fontSize: 14, color: ACCENT, bold: true, charSpacing: 3, fontFace: FONT });
  s.addText("算法建模与数据", { x: 1.0, y: 3.0, w: 11, h: 1.0, fontSize: 40, bold: true, color: WHITE, fontFace: FONT });
  s.addText("数据底座 · AI 特征 · Hedonic 模型与 SHAP", { x: 1.0, y: 4.05, w: 11, h: 0.5, fontSize: 16, color: "CADCFC", fontFace: FONT });
}

// ---------- 16. 数据底座 stat ----------
{
  const s = pptx.addSlide();
  titleBar(s, "数据底座：结构化全量沉淀", "DATA FOUNDATION");
  const stats = [
    ["225", "资产", "手写 25 + 生成 200，含 12 组 AI 特征"],
    ["325", "竞品", "贝壳 / 58 / 房天下 等爬虫来源"],
    ["876", "历史成交", "覆盖 2019 – 2026，每资产 2–7 笔"],
    ["26", "POI", "地铁站 / 商圈 / 热力点"],
  ];
  stats.forEach((st, i) => {
    const x = 0.9 + i * 2.95;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.9, w: 2.75, h: 3.6, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
    s.addText(st[0], { x, y: 2.2, w: 2.75, h: 1.3, fontSize: 54, bold: true, color: NAVY, align: "center", fontFace: FONT });
    s.addText(st[1], { x, y: 3.55, w: 2.75, h: 0.4, fontSize: 16, bold: true, color: ACCENT2, align: "center", fontFace: FONT });
    s.addText(st[2], { x: x + 0.2, y: 4.05, w: 2.35, h: 1.2, fontSize: 11, color: MUTED, align: "center", fontFace: FONT });
  });
  s.addText("每条 AI 特征标注数据来源 + Hedonic 输入标记（合规审计可追溯）", { x: 0.9, y: 5.8, w: 11.5, h: 0.5, fontSize: 13, italic: true, color: INK, align: "center", fontFace: FONT });
}

// ---------- 17. AI 特征 12 组 ----------
shotSlide("AI 建模特征：12 组 81 字段", "AI FEATURES", "04_detail_aifeature.png",
  "标品 / 非标差异化布局，来源标注 + Hedonic 蓝标，可被 SHAP / LIME 解释");

// ---------- 18. Hedonic + SHAP ----------
{
  const s = pptx.addSlide();
  titleBar(s, "定价模型与可解释性", "MODEL & SHAP");
  s.addText("Hedonic 对数线性回归", { x: 0.9, y: 1.5, w: 6, h: 0.5, fontSize: 18, bold: true, color: NAVY, fontFace: FONT });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 2.1, w: 5.7, h: 1.4, fill: { color: "0F172A" } });
  s.addText("ln(日租金) = β0 + Σ βi · xi", { x: 1.1, y: 2.1, w: 5.3, h: 1.4, fontSize: 18, bold: true, color: "5EEAD4", valign: "middle", align: "center", fontFace: "Consolas" });
  s.addText([
    { text: "市场比较法 + 历史数据法双轨\n", options: { bullet: true } },
    { text: "系数可经后端 PUT 覆盖为真实训练结果\n", options: { bullet: true } },
    { text: "回归优于纯深度学习：可解释、可审计、小样本稳健", options: { bullet: true } },
  ], { x: 0.9, y: 3.7, w: 5.7, h: 2.5, fontSize: 13, color: INK, fontFace: FONT, lineSpacingMultiple: 1.3 });

  s.addText("SHAP 边际贡献分解", { x: 7.0, y: 1.5, w: 5.4, h: 0.5, fontSize: 18, bold: true, color: NAVY, fontFace: FONT });
  s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: 2.1, w: 5.4, h: 4.1, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 } });
  s.addText([
    { text: "每个定价结论都能解释：", options: { bold: true, color: INK, breakLine: true } },
    { text: "哪些特征拉高 / 拉低了价格\n", options: { color: MUTED, breakLine: true } },
    { text: "例：区位  +0.8 元 ｜ 物理状态  −0.3 元\n", options: { color: ACCENT2, breakLine: true } },
    { text: "例：流拍记录  −0.5 元 ｜ 装修  +0.2 元\n", options: { color: ACCENT2, breakLine: true } },
    { text: "\n业务方看得懂，监管问得清", options: { italic: true, color: INK } },
  ], { x: 7.25, y: 2.35, w: 5.0, h: 3.6, fontSize: 13, fontFace: FONT, lineSpacingMultiple: 1.25, valign: "top" });
}

// ---------- 19. 建模介绍页 ----------
shotSlide("建模介绍页", "MODELING INTRO", "07_modeling.png",
  "Hedonic 特征价格法原理、特征维度与贡献分解的可读说明");

// ---------- 20. 结语 / 路线图 ----------
{
  const s = pptx.addSlide();
  titleBar(s, "当前进展与后续路线", "ROADMAP");
  s.addText("当前落地", { x: 0.9, y: 1.5, w: 5, h: 0.4, fontSize: 15, bold: true, color: ACCENT2, fontFace: FONT });
  s.addText([
    { text: "M1–M4 全交付；新增估价录入 / 尽调中心 / 建模介绍 3 页\n", options: { bullet: true } },
    { text: "数据集统一为 225 / 325 / 876 / 26，已全量迁移入库\n", options: { bullet: true } },
    { text: "信创部署镜像就绪（麒麟 OS）", options: { bullet: true } },
  ], { x: 0.9, y: 1.95, w: 5.6, h: 2.5, fontSize: 13, color: INK, fontFace: FONT, lineSpacingMultiple: 1.3 });
  s.addText("后续路线", { x: 7.0, y: 1.5, w: 5, h: 0.4, fontSize: 15, bold: true, color: ACCENT, fontFace: FONT });
  s.addText([
    { text: "XGBoost / LightGBM 作为可选升级（更大样本时）\n", options: { bullet: true } },
    { text: "真实 BFF 联调与爬虫调度 Airflow\n", options: { bullet: true } },
    { text: "邀请客户试点资产 / 城市，做定制化验证", options: { bullet: true } },
  ], { x: 7.0, y: 1.95, w: 5.4, h: 2.5, fontSize: 13, color: INK, fontFace: FONT, lineSpacingMultiple: 1.3 });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 5.0, w: 11.5, h: 1.4, fill: { color: NAVY } });
  s.addText("结论：以「结论先行 + 证据可追溯 + 非黑盒」为核心，把资产估值从经验驱动升级为数据驱动的决策基础设施。", {
    x: 1.2, y: 5.0, w: 11, h: 1.4, fontSize: 15, bold: true, color: WHITE, valign: "middle", fontFace: FONT,
  });
}

pptx.writeFile({ fileName: path.resolve(__dirname, "资产估值平台_客户汇报.pptx") }).then((f) => {
  console.log("WROTE", f);
});
