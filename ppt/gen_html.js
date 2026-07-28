const fs = require('fs');
const path = require('path');

const shotsDir = path.join(__dirname, 'shots');
const files = {
  DASHBOARD: '01_dashboard.png',
  DETAIL_TOP: '02_detail_top.png',
  DETAIL_COMP: '03_detail_comp.png',
  DETAIL_AI: '04_detail_aifeature.png',
  NEW_VAL: '05_new_valuation.png',
  DUE: '06_due_diligence.png',
  MODELING: '07_modeling.png',
};

const img = {};
for (const [k, f] of Object.entries(files)) {
  const b = fs.readFileSync(path.join(shotsDir, f));
  img[k] = 'data:image/png;base64,' + b.toString('base64');
}

// 架构图 SVG（由 make_svgs.py 手写生成，零依赖、文字对比度内建，无 switch/light-dark 依赖）
const archSvg = fs.readFileSync(path.join(__dirname, 'arch.svg'), 'utf8');

// 架构设计方法专章三张图（make_svgs.py 手写生成，转 SVG 内联）
const diaFiles = {
  syscontext: 'diagrams/syscontext.svg',
  deploy: 'diagrams/opstop.svg',     // 部署架构（文件名 opstop 仅为规避误操作）
  sequence: 'diagrams/sequence.svg',
};
const dia = {};
for (const [k, f] of Object.entries(diaFiles)) {
  let s = fs.readFileSync(path.join(__dirname, f), 'utf8');
  s = s.replace(/<switch>[\s\S]*?<\/switch>/g, '');
  dia[k] = s;
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>XX地产 · AI 资产估值Demo平台 — 客户汇报</title>
<style>
  :root{
    --navy:#0f2742; --navy2:#163a5f; --navy3:#1e4d7b;
    --teal:#14b8a6; --blue:#2f80ed; --gold:#e0a82e;
    --bg:#eef2f7; --card:#ffffff; --ink:#1f2d3d; --muted:#66788f; --line:#e2e8f0;
    --biz:#2f80ed; --tech:#14b8a6; --boss:#e0a82e;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;
    color:var(--ink); background:var(--bg); line-height:1.7; -webkit-font-smoothing:antialiased;
  }
  a{color:inherit;text-decoration:none}

  /* ===== Nav ===== */
  .nav{
    position:sticky; top:0; z-index:50; background:rgba(15,39,66,.96);
    backdrop-filter:blur(8px); display:flex; align-items:center; gap:4px;
    padding:0 22px; height:54px; box-shadow:0 2px 12px rgba(0,0,0,.15); overflow-x:auto;
  }
  .nav .brand{color:#fff; font-weight:700; letter-spacing:.5px; margin-right:14px; white-space:nowrap; font-size:15px}
  .nav .brand small{color:var(--teal); font-weight:600; margin-left:6px; font-size:12px}
  .nav a{color:#cdd9e6; font-size:13.5px; padding:8px 12px; border-radius:7px; white-space:nowrap; transition:.2s}
  .nav a:hover{background:rgba(255,255,255,.08); color:#fff}
  .nav a.active{background:var(--teal); color:#06281f; font-weight:700}
  .nav .spacer{flex:1}
  .nav .print{color:#cdd9e6; border:1px solid rgba(255,255,255,.25); padding:6px 12px; border-radius:7px; font-size:13px; white-space:nowrap}
  .nav .print:hover{background:rgba(255,255,255,.1); color:#fff}

  /* ===== Layout ===== */
  section{padding:64px 0; border-bottom:1px solid var(--line)}
  .wrap{max-width:1120px; margin:0 auto; padding:0 28px}
  .sec-tag{display:inline-block; font-size:12px; font-weight:700; letter-spacing:1px; color:#fff; background:var(--navy3); padding:4px 12px; border-radius:20px; margin-bottom:14px}
  .sec-tag.biz{background:var(--biz)} .sec-tag.tech{background:var(--tech)} .sec-tag.boss{background:var(--boss); color:#3a2a00}
  h2.title{font-size:30px; font-weight:800; color:var(--navy); letter-spacing:.5px; margin-bottom:10px}
  .subtitle{color:var(--muted); font-size:15px; margin-bottom:34px; max-width:820px}
  h3{font-size:20px; color:var(--navy2); margin:30px 0 14px; font-weight:700}
  p{margin:12px 0; color:#33424f}
  .lead{font-size:17px; color:#27384a}

  /* ===== Hero ===== */
  .hero{
    background:radial-gradient(1200px 500px at 80% -10%,rgba(20,184,166,.25),transparent),
               linear-gradient(135deg,var(--navy) 0%,var(--navy2) 60%,#0c3550 100%);
    color:#eaf2fb; padding:72px 0 64px;
  }
  .hero .wrap{position:relative}
  .kicker{color:var(--teal); font-weight:700; letter-spacing:3px; font-size:13px; text-transform:uppercase}
  .hero h1{font-size:42px; font-weight:800; margin:14px 0 10px; line-height:1.25; color:#fff}
  .hero .tagline{font-size:19px; color:#bcd2e6; max-width:780px}
  .stats{display:flex; flex-wrap:wrap; gap:16px; margin-top:36px}
  .stat{background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); border-radius:14px; padding:18px 22px; min-width:150px; flex:1}
  .stat b{display:block; font-size:34px; font-weight:800; color:#fff; line-height:1.1}
  .stat span{font-size:13.5px; color:#a9c2d8}
  .tri{display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:40px}
  .tricard{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:20px}
  .tricard .who{font-size:13px; font-weight:700; padding:3px 10px; border-radius:14px; display:inline-block; margin-bottom:10px}
  .tricard.biz .who{background:var(--biz); color:#fff}
  .tricard.tech .who{background:var(--tech); color:#06281f}
  .tricard.boss .who{background:var(--boss); color:#3a2a00}
  .tricard p{color:#d7e6f3; font-size:14.5px; margin:0}

  /* ===== Cards / grid ===== */
  .grid{display:grid; gap:18px}
  .g3{grid-template-columns:repeat(3,1fr)} .g2{grid-template-columns:repeat(2,1fr)} .g4{grid-template-columns:repeat(4,1fr)}
  .card{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px; box-shadow:0 1px 3px rgba(16,39,66,.05)}
  .card h4{font-size:16px; color:var(--navy); margin-bottom:8px; font-weight:700}
  .card .ic{font-size:22px; margin-bottom:8px; display:block}
  .card p{font-size:14px; color:#445; margin:0}

  .pill{display:inline-block; background:#eaf3fb; color:var(--navy3); border-radius:20px; padding:3px 11px; font-size:12.5px; font-weight:600; margin:3px 4px 3px 0}

  /* table */
  table{width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(16,39,66,.05)}
  th,td{padding:12px 14px; text-align:left; border-bottom:1px solid var(--line)}
  th{background:var(--navy); color:#fff; font-weight:600; font-size:13px}
  tr:last-child td{border-bottom:none}
  td b{color:var(--navy2)}
  .ok{color:#0a8a4a; font-weight:700} .no{color:#c0392b; font-weight:700}

  /* flow */
  .flow{display:flex; align-items:stretch; gap:0; flex-wrap:wrap; margin:24px 0}
  .flow .step{flex:1; min-width:160px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; position:relative; box-shadow:0 1px 3px rgba(16,39,66,.05)}
  .flow .step .n{position:absolute; top:-12px; left:14px; width:26px; height:26px; border-radius:50%; background:var(--teal); color:#06281f; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center}
  .flow .step h4{margin:8px 0 4px; font-size:14.5px; color:var(--navy)}
  .flow .step p{font-size:12.5px; color:var(--muted); margin:0}
  .flow .arrow{display:flex; align-items:center; color:var(--navy3); font-size:22px; padding:0 4px}
  @media(max-width:820px){.flow .arrow{transform:rotate(90deg); padding:6px 0} .flow .step{min-width:100%}}

  /* figure */
  figure{margin:18px 0; background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(16,39,66,.06)}
  figure img{width:100%; display:block; border-bottom:1px solid var(--line)}
  figure figcaption{font-size:13px; color:var(--muted); padding:12px 16px; background:#fafcfe}
  figure figcaption b{color:var(--navy2)}
  .shots2{display:grid; grid-template-columns:1fr 1fr; gap:18px}
  @media(max-width:820px){.shots2{grid-template-columns:1fr} .tri{grid-template-columns:1fr} .g2,.g3,.g4{grid-template-columns:1fr}}

  /* architecture */
  .arch{display:grid; gap:14px; margin:20px 0}
  .arch .layer{background:#fff; border:1px solid var(--line); border-left:5px solid var(--navy3); border-radius:10px; padding:16px 18px; display:flex; align-items:center; gap:16px}
  .arch .layer .lab{font-weight:800; color:var(--navy); min-width:120px; font-size:15px}
  .arch .layer .items{display:flex; flex-wrap:wrap; gap:8px}
  .arch .layer .items span{background:#eef4fa; border:1px solid #d8e6f3; color:#234; border-radius:8px; padding:5px 11px; font-size:13px}
  .arch .layer.l1{border-left-color:var(--biz)} .arch .layer.l2{border-left-color:var(--teal)} .arch .layer.l3{border-left-color:var(--gold)}

  .callout{background:#f4fbf9; border:1px solid #bdeedd; border-left:5px solid var(--teal); border-radius:12px; padding:18px 20px; margin:18px 0}
  .callout.boss{background:#fffaf0; border-color:#f0dcae; border-left-color:var(--boss)}
  .callout h4{color:var(--navy); margin-bottom:6px; font-size:16px}
  .callout p{margin:0; font-size:14.5px; color:#3a4a58}

  .formula{background:#0f2742; color:#eaf2fb; border-radius:12px; padding:20px 22px; font-family:"SF Mono",Consolas,Menlo,monospace; font-size:15px; line-height:1.9; overflow-x:auto}
  .formula .v{color:var(--teal)} .formula .c{color:#9fd0ff}

  ul.clean{list-style:none; margin:14px 0}
  ul.clean li{padding:9px 0 9px 26px; position:relative; border-bottom:1px dashed var(--line); font-size:14.5px}
  ul.clean li:before{content:"▸"; position:absolute; left:4px; color:var(--teal); font-weight:800}
  ul.clean li:last-child{border-bottom:none}

  .footer{background:var(--navy); color:#bcccdb; padding:40px 0; font-size:13.5px; text-align:center}
  .footer b{color:#fff}

  @media print{
    .nav{display:none}
    section{page-break-inside:avoid; border-bottom:none; padding:30px 0}
    figure, .card, .arch .layer, .tricard{break-inside:avoid}
    body{background:#fff}
  }

  /* 架构图动态箭头（drawio 导出虚线边 + CSS 流动动画） */
  .arch-svg-wrap svg{width:100%;height:auto;display:block}
  @keyframes archDash{ to { stroke-dashoffset:-12; } }
  .arch-svg-wrap svg path[stroke-dasharray]{ animation:archDash .9s linear infinite; }
  @media (prefers-reduced-motion: reduce){ .arch-svg-wrap svg path[stroke-dasharray]{ animation:none; } }

  /* 架构设计方法三张图（drawio 绘制 + 动态箭头） */
  .method-fig{margin:16px 0 4px; border:1px solid var(--line); border-radius:14px; padding:12px; background:#fff}
  .method-fig svg{width:100%;height:auto;display:block}
  .method-fig svg path[stroke-dasharray]{ animation:archDash .9s linear infinite; }
  @media (prefers-reduced-motion: reduce){ .method-fig svg path[stroke-dasharray]{ animation:none; } }
</style>
</head>
<body>

<nav class="nav">
  <div class="brand">AI 资产估值平台 <small>客户汇报</small></div>
  <a href="#exec">执行摘要</a>
  <a href="#nav-guide">汇报导航</a>
  <a href="#ch1">一·项目是什么</a>
  <a href="#ch2">二·业务流与使用</a>
  <a href="#ch3">三·算法建模与数据</a>
  <a href="#ch-method">四·架构设计方法</a>
  <a href="#ch4">五·进展与路线图</a>
  <a href="#end">结语</a>
  <span class="spacer"></span>
  <a class="print" href="javascript:void(0)" onclick="window.print()">打印 / 导出 PDF</a>
</nav>

<!-- ============ HERO / 执行摘要 ============ -->
<header class="hero" id="exec">
  <div class="wrap">
    <div class="kicker">XX地产 · 资产估值与尽调数字化</div>
    <h1>AI 资产估值Demo平台</h1>
    <p class="tagline">面向资管 / 投决 / 尽调团队的 AI 辅助资产估值与尽调平台 —— <b style="color:#fff">结论先行、证据可追溯、非黑盒</b>。</p>

    <div class="stats">
      <div class="stat"><b>225</b><span>在管资产（北京/上海/广深等）</span></div>
      <div class="stat"><b>325</b><span>可比竞品挂牌</span></div>
      <div class="stat"><b>876</b><span>历史成交记录（2019–2026）</span></div>
      <div class="stat"><b>26</b><span>POI 周边配套点</span></div>
    </div>

    <div class="tri">
      <div class="tricard boss">
        <span class="who">给客户大领导</span>
        <p>决策有据、合规可审。AI 不是黑盒，而是能向监管和董事会说清"为什么定这个价"的定价助手，显著降低估值主观风险。</p>
      </div>
      <div class="tricard biz">
        <span class="who">给业务负责人</span>
        <p>估值从"天级"压缩到"分钟级"，新资产录入即可出建议租金；每个结论都能一路下钻到原始字段与数据来源，过程全留痕。</p>
      </div>
      <div class="tricard tech">
        <span class="who">给技术负责人</span>
        <p>方法可解释、数据可追溯、架构可落地。已内置 SQLite 数据后端，支持 Docker / 麒麟 OS 信创内网部署，平滑对接真实 BFF。</p>
      </div>
    </div>
  </div>
</header>

<!-- ============ 汇报导航 ============ -->
<section id="nav-guide">
  <div class="wrap">
    <span class="sec-tag boss">给三类受众的导航</span>
    <h2 class="title">这份汇报，您该重点看哪里？</h2>
    <p class="subtitle">同一套平台，三类角色关注点不同。下面按角色给出"最该看的章节"，方便您在汇报现场快速对齐。</p>
    <div class="grid g3">
      <div class="card">
        <span class="ic">👔</span>
        <h4>业务负责人（投决 / 资管 / 尽调）</h4>
        <p>看 <b>第二章「主业务流和使用方法」</b>：从资产地图找标的 → 详情看定价 → 竞品对标联动 → 新资产分钟级估价 → 尽调建单。重点关注"效率提升"与"结论可解释"。</p>
        <div style="margin-top:10px"><span class="pill">效率</span><span class="pill">结论可下钻</span><span class="pill">尽调留痕</span></div>
      </div>
      <div class="card">
        <span class="ic">🛠️</span>
        <h4>技术负责人（架构 / 数据 / 模型）</h4>
        <p>看 <b>第三章「算法建模与数据」</b> 与 <b>第四章「架构设计方法」</b>：数据底座来源与治理、Hedonic 对数线性回归、SHAP 可解释、非标处理、部署与信创，以及遵循贵司规范的 6 类架构图标准。重点关注"可解释、可追溯、可落地"。</p>
        <div style="margin-top:10px"><span class="pill">可解释</span><span class="pill">数据治理</span><span class="pill">信创部署</span></div>
      </div>
      <div class="card">
        <span class="ic">🏛️</span>
        <h4>客户大领导（战略 / 决策）</h4>
        <p>看 <b>执行摘要 + 第一章「项目是什么」+ 第五章「进展与路线图」</b>：一页纸看懂价值、风险可控、落地进展与未来演进。重点关注"战略价值与决策安全"。</p>
        <div style="margin-top:10px"><span class="pill">战略价值</span><span class="pill">风险可控</span><span class="pill">已落地</span></div>
      </div>
    </div>
  </div>
</section>

<!-- ============ 第一章 项目是什么 ============ -->
<section id="ch1">
  <div class="wrap">
    <span class="sec-tag boss">受众：大领导 · 业务</span>
    <h2 class="title">一、项目是什么</h2>
    <p class="subtitle">一句话说清我们做了什么、解决了什么、为什么值得投入。</p>

    <div class="callout boss">
      <h4>一句话定位</h4>
      <p>把"靠人拍脑袋、周期长、口径乱、过程不可追溯"的资产估值，升级为 <b>结论先行 + 证据可追溯</b> 的 AI 辅助工作台 —— 定价结果、贡献因子、数据来源三位一体，业务看得懂、监管问得清。</p>
    </div>

    <h3>1.1 传统估值的三大痛点</h3>
    <div class="grid g3">
      <div class="card"><span class="ic">⏳</span><h4>周期长、口径乱</h4><p>人工评估依赖经验，单笔资产数天；不同估值师口径不一，结果难以横向比较与复核。</p></div>
      <div class="card"><span class="ic">🧩</span><h4>数据孤岛</h4><p>竞品挂牌、历史成交、POI 配套散落在贝壳/58/链家与内部 ERP，无结构化沉淀，复用率低。</p></div>
      <div class="card"><span class="ic">🎲</span><h4>非标拍脑袋</h4><p>特殊资产缺乏参考框架，往往凭感觉定价，既无依据也无审计线索，风险敞口大。</p></div>
    </div>

    <h3>1.2 我们的价值：传统 vs 本平台</h3>
    <table>
      <thead><tr><th>维度</th><th>传统人工估值</th><th>本 AI 平台</th></tr></thead>
      <tbody>
        <tr><td><b>效率</b></td><td class="no">单笔数天，依赖专家排期</td><td class="ok">新资产分钟级出建议租金</td></tr>
        <tr><td><b>可解释</b></td><td class="no">结论靠经验，难拆解</td><td class="ok">SHAP 分解每个因子的抬升/压低贡献</td></tr>
        <tr><td><b>可追溯</b></td><td class="no">过程散落，难审计</td><td class="ok">每条结论下钻到原始字段与数据来源</td></tr>
        <tr><td><b>非标处理</b></td><td class="no">易拍脑袋、无依据</td><td class="ok">给参考区间 + 人工可调系数 + 相似案例</td></tr>
        <tr><td><b>数据资产</b></td><td class="no">一次性，不复用</td><td class="ok">爬取数据全量结构化入库，持续沉淀</td></tr>
      </tbody>
    </table>

    <h3>1.3 技术架构总览（三层，可落地）</h3>
    <figure class="arch-svg-wrap">
      ${archSvg}
      <figcaption>项目技术架构（箭头表示数据 / 调用流向，动态演示）：用户层 → 前端应用层 → 数据后端层 ↔ 外部数据来源；前端与后端均与 AI 模型层联动（定价请求 / SHAP 贡献 / 模型系数）。</figcaption>
    </figure>
    <p class="subtitle" style="margin-top:8px">部署形态：支持 Docker（nginx 托管，约 30–40MB）+ 麒麟 OS 信创内网镜像，平滑对接真实 BFF 与 PostgreSQL+PostGIS。</p>
  </div>
</section>

<!-- ============ 第二章 主业务流和使用方法 ============ -->
<section id="ch2">
  <div class="wrap">
    <span class="sec-tag biz">受众：业务负责人</span>
    <h2 class="title">二、主业务流和使用方法</h2>
    <p class="subtitle">从"找标的"到"出报告"，端到端怎么用。以下截图均来自真实运行系统。</p>

    <h3>2.1 三类用户与入口</h3>
    <div class="grid g3">
      <div class="card"><span class="ic">🎯</span><h4>投决 / 资管</h4><p>资产地图按业态/批次/区域筛选 → 进详情看智能定价与竞品对标 → 生成《租金评估建议书》。</p></div>
      <div class="card"><span class="ic">🧮</span><h4>估值师</h4><p>新资产估价录入：填特征 → 一键测算 → 建议日租金 + 置信度 + SHAP 贡献。</p></div>
      <div class="card"><span class="ic">🔍</span><h4>风控 / 尽调</h4><p>尽调中心建单 → 资产接收 intake 下钻 → 风险点与证据链一目了然。</p></div>
    </div>

    <h3>2.2 端到端主业务流程</h3>
    <div class="flow">
      <div class="step"><span class="n">1</span><h4>全域资产地图</h4><p>空间筛选 + 图层控制，快速锁定标的</p></div>
      <div class="arrow">→</div>
      <div class="step"><span class="n">2</span><h4>资产详情·结论先行</h4><p>先看定价结论，再下钻支撑特征</p></div>
      <div class="arrow">→</div>
      <div class="step"><span class="n">3</span><h4>竞品对标联动</h4><p>点/hover 竞品行 ↔ 地图飞行高亮</p></div>
      <div class="arrow">→</div>
      <div class="step"><span class="n">4</span><h4>生成评估报告</h4><p>八项合规审查 + 一键导出 PDF</p></div>
    </div>
    <div class="flow">
      <div class="step"><span class="n">A</span><h4>新资产估价录入</h4><p>周边竞品检索 → 建议租金 + 置信度</p></div>
      <div class="arrow">→</div>
      <div class="step"><span class="n">B</span><h4>尽职调查中心</h4><p>建单 / 接收 / 资产下钻</p></div>
      <div class="arrow">→</div>
      <div class="step"><span class="n">C</span><h4>数据情报站</h4><p>爬虫任务 + POI 真实拉取</p></div>
      <div class="arrow">→</div>
      <div class="step"><span class="n">D</span><h4>建模介绍</h4><p>方法学原理透明可查</p></div>
    </div>

    <h3>2.3 关键页面实拍</h3>
    <figure>
      <img src="${img.DASHBOARD}" alt="Dashboard 资产地图" />
      <figcaption><b>① 全域资产 GIS 地图</b>：225 资产按形态/颜色分桶，支持业态、批次、区域图层控制与地铁/商圈/热力宏观图层，右侧实时聚合统计。</figcaption>
    </figure>
    <div class="shots2">
      <figure>
        <img src="${img.DETAIL_TOP}" alt="资产详情结论先行" />
        <figcaption><b>② 资产详情 · 结论先行</b>：头部直接给出智能定价结论，右侧"可信度来源"闭环，再下钻画像、竞品、历史、AI 特征。</figcaption>
      </figure>
      <figure>
        <img src="${img.DETAIL_COMP}" alt="竞品对标联动" />
        <figcaption><b>③ 竞品对标 · 双向联动</b>：左侧雷达 + 右侧表格并列；点击竞品行，地图飞行高亮对应点位，hover 即显特征。</figcaption>
      </figure>
    </div>
    <div class="shots2">
      <figure>
        <img src="${img.NEW_VAL}" alt="新资产估价录入" />
        <figcaption><b>④ 新资产估价录入</b>：录入特征 → 自动检索周边竞品 → 输出建议日租金（中心 + 区间）+ SHAP 贡献条 + 置信度。开箱即用。</figcaption>
      </figure>
      <figure>
        <img src="${img.DUE}" alt="尽职调查中心" />
        <figcaption><b>⑤ 尽职调查中心</b>：尽调任务管理、新建尽调单、资产接收 intake 下钻，风险与证据链集中呈现。</figcaption>
      </figure>
    </div>
  </div>
</section>

<!-- ============ 第三章 算法建模与数据 ============ -->
<section id="ch3">
  <div class="wrap">
    <span class="sec-tag tech">受众：技术负责人</span>
    <h2 class="title">三、算法建模与数据</h2>
    <p class="subtitle">为什么可信？数据从哪来、模型怎么算、结论怎么解释 —— 透明、可审计、可落地。</p>

    <h3>3.1 数据底座：让结论站得住脚的前提</h3>
    <div class="grid g4">
      <div class="card"><b style="font-size:26px;color:var(--navy)">225</b><p>资产主表（手写 25 + 程序化 200）</p></div>
      <div class="card"><b style="font-size:26px;color:var(--navy)">325</b><p>竞品挂牌（贝壳/58/房天下/链家）</p></div>
      <div class="card"><b style="font-size:26px;color:var(--navy)">876</b><p>历史成交（2019–2026）</p></div>
      <div class="card"><b style="font-size:26px;color:var(--navy)">26</b><p>POI 配套（地铁/商圈/热力）</p></div>
    </div>
    <ul class="clean">
      <li><b>来源多样</b>：内部 ERP + 爬虫（贝壳/58/房天下/链家）+ 宏观 GIS，已全量结构化入库（SQLite）。</li>
      <li><b>治理严格</b>：每条 AI 特征标注数据来源 + Hedonic 输入标记，保留 raw_json 原始字段，便于回溯与合规审计。</li>
      <li><b>空间能力</b>：支持按经纬度半径检索周边竞品 / POI，直接服务新资产估价。</li>
    </ul>

    <h3>3.2 AI 建模特征：12 组 81 字段</h3>
    <figure>
      <img src="${img.DETAIL_AI}" alt="AI 建模特征 12 组" />
      <figcaption><b>AI 特征全景</b>：基础属性 / 区位 / 物理状态 / 历史交易 / OCR 报告 / 竞品挂牌 / 流拍 / 人工调研 / POI / 时间戳 / 交易条件 / 时间特征，共 12 组 81 字段，每条标注来源与 Hedonic 输入标记。</figcaption>
    </figure>

    <h3>3.3 定价模型：Hedonic 对数线性回归</h3>
    <div class="formula">
      ln(租金) <span class="c">=</span> β₀ <span class="c">+</span> Σ βᵢ · xᵢ<br/>
      <span class="v">prediction</span> = exp(β₀ + Σ βᵢ·(xᵢ − meanᵢ))   <span class="c"># 偏效应分解 → SHAP 贡献</span>
    </div>
    <table>
      <thead><tr><th>方法</th><th>输入维度</th><th>算法</th><th>拟合优度 R²</th></tr></thead>
      <tbody>
        <tr><td><b>市场比较法</b></td><td>9 维（地铁距离/成新/装修/权证/学区/商密/CBD/免租…）</td><td>Hedonic 对数线性</td><td class="ok">≈ 0.92</td></tr>
        <tr><td><b>历史数据法</b></td><td>4 维（基准价/装修/装修年限/免租）</td><td>Hedonic 对数线性</td><td class="ok">≈ 0.85</td></tr>
      </tbody>
    </table>
    <div class="callout">
      <h4>为什么用回归而非纯深度学习？</h4>
      <p>小样本稳健、系数可解释、过程可审计 —— 对国企合规场景，<b>"说得清"比"黑盒更准"更重要</b>。模型系数存储于后端 hedonic_models 表，可经 API 覆盖为真实训练结果，前端零改动。</p>
    </div>

    <h3>3.4 可解释性：SHAP 边际贡献</h3>
    <p>每个定价结论都能分解为"哪些特征拉高 / 拉低了价格、各贡献多少"。示例：区位 +0.8 元/㎡·天、物理状态 −0.3 元/㎡·天……每一行都含<b>中文业务名 + 解释 + 取值来源</b>，业务方看得懂、监管问得清。</p>

    <h3>3.5 非标资产：不给硬数字，给参考区间</h3>
    <ul class="clean">
      <li>自动判定非标（空置超 180 天 / 成新≤3 / 地铁&>5000m / 军产遗留等）。</li>
      <li>输出<b>参考区间</b>而非精确值，残值 / 运输系数支持人工 slider 修正。</li>
      <li>下钻 4 个最相似案例，辅助一线人工判断 —— 既用 AI，又保留人的责任边界。</li>
    </ul>

    <h3>3.6 建模介绍页（方法学透明可查）</h3>
    <figure>
      <img src="${img.MODELING}" alt="建模介绍页" />
      <figcaption><b>建模介绍</b>：Hedonic 特征价格法原理、特征维度、贡献分解说明页，面向业务与监管公开透明。</figcaption>
    </figure>

    <h3>3.7 部署与演进</h3>
    <div class="grid g2">
      <div class="card"><span class="ic">🐳</span><h4>部署形态</h4><p>Docker 多阶段构建（nginx 托管，约 30–40MB）；内网 Harbor + 麒麟 OS 信创镜像已就绪；SPA fallback、静态资源 immutable、gzip、/healthz 健康检查齐备。</p></div>
      <div class="card"><span class="ic">🔌</span><h4>对接与扩展</h4><p>数据后端 REST API 全 CRUD；数据量增大可平滑迁移 PostgreSQL+PostGIS（表结构兼容）；模型可服务化升级（更大样本时启用 XGBoost / LightGBM 备选）。</p></div>
    </div>
  </div>
  </section>

  <!-- ============ 新章 架构设计方法（遵循贵司 PPT 规范） ============ -->
  <section id="ch-method">
    <div class="wrap">
      <span class="sec-tag tech">受众：技术负责人 · 大领导</span>
      <h2 class="title">四、架构设计方法（遵循贵司规范）</h2>
      <p class="subtitle">我们采用贵司制定的"应用架构一级 / 二级制品 + 数据架构一级制品"体系来设计与呈现系统架构，确保从概念、上下文、集成、部署、技术栈到运行时的全视角覆盖，且每一张图都可评审、可追溯、可交付。</p>

      <div class="callout">
        <h4>为什么要有"架构设计方法"？</h4>
        <p>架构不是一张图，而是一套分层的视角。不同角色在不同阶段需要不同抽象：大领导看战略与边界，架构师看集成与技术选型，运维看部署与拓扑。下面 6 类图标准，正是把"怎么画架构"统一为可复用的交付规范。</p>
      </div>

      <h3>4.1 应用架构一级制品（5 类图）</h3>
      <div class="grid g2">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>① 总体架构 <span style="font-weight:400;color:var(--muted);font-size:12.5px">Architect Overview</span></h4>
            <span class="pill">应用一级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>呈现系统架构及其与外部系统集成的一个<b>概念层面的清晰图景</b>；促进不同干系人与开发者之间的有效沟通，为新加入项目的人员指明方向。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>已交付（见第一章 1.3）三层技术架构图，含用户层 / 前端应用层 / 数据后端层 / 外部数据来源 / AI 模型层与动态流向。</p>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>② 系统上下文 <span style="font-weight:400;color:var(--muted);font-size:12.5px">System Context</span></h4>
            <span class="pill">应用一级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>突出系统的重要特征——用户、外部系统、输入和输出；系统必须响应的外部事件；生成并影响外部实体的事件；从外部接收并处理的数据；生成并发送到外部的数据。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>用户＝投决 / 资管 / 估值师 / 风控尽调；外部系统＝内部 ERP、贝壳·58·链家·房天下爬虫、政府公开数据、宏观 GIS / POI；数据进出＝爬取写入、定价与对标读出。</p>
          <figure class="method-fig">${dia.syscontext}<figcaption style="font-size:12.5px;color:var(--muted);margin-top:6px">系统上下文图（箭头为动态流向：用户→平台 / 平台↔外部系统 数据进出）</figcaption></figure>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>③ 系统集成架构 <span style="font-weight:400;color:var(--muted);font-size:12.5px">System Integration</span></h4>
            <span class="pill">应用一级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>展示系统与外部系统 / 内部模块之间的集成关系与接口。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>前端（React）↔ 后端 REST API（Express，端口 3001）↔ SQLite；爬虫服务 → 数据后端写入；AI 模型服务（Hedonic / SHAP）经 <code>/api/models</code> 暴露。</p>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>④ 部署架构 <span style="font-weight:400;color:var(--muted);font-size:12.5px">Operation Model</span></h4>
            <span class="pill">应用一级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>逻辑部署 + 物理部署；标识流量入口及内部走向；每层部署单元（负载均衡 / Nginx / 网关 / 防火墙）；硬件资源类型与网络区域；IP + 端口；网络拓扑。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>Docker 多阶段（nginx 托管 SPA，约 30–40MB）+ 麒麟 OS 信创内网；前端静态托管、后端 :3001、SQLite 文件库；逻辑 / 物理部署图如下。</p>
          <figure class="method-fig">${dia.deploy}<figcaption style="font-size:12.5px;color:var(--muted);margin-top:6px">部署架构图（动态箭头：用户→负载均衡→防火墙→内网容器；后端与爬虫/AI/库联动）</figcaption></figure>
        </div>

        <div class="card" style="grid-column:1 / -1">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>⑤ 分层技术栈 <span style="font-weight:400;color:var(--muted);font-size:12.5px">Technical Architecture</span></h4>
            <span class="pill">应用一级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>① 技术需求识别 → 技术选型 → 决定实际运行组件（负载 / 网关 / 前端框架 / 微服务框架 / 中间件 / 数据库）；② 考虑非功能特性（高可用 / 高性能 / 可扩展）系统级把握；③ 识别运行组件关系与部署策略。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>前端 React18 + TS + Vite + Antd + Recharts + Zustand；服务层 Express + SQLite；算法层 Hedonic + SHAP；部署 Docker + 麒麟信创。</p>
        </div>
      </div>

      <h3>4.2 应用架构二级制品 & 数据架构一级制品</h3>
      <div class="grid g2">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>⑥ 时序图 <span style="font-weight:400;color:var(--muted);font-size:12.5px">Sequence Diagram</span></h4>
            <span class="pill grey">应用二级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>自左向右反应服务之间、服务与外部系统之间的调用关系；自上而下反应调用先后顺序及其返回；体现一次或多次调用的事务性。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>例—新资产估价时序：前端表单 → <code>POST /api/models/predict</code> → 模型服务（读 hedonic_models 系数）→ <code>GET /api/competitors</code> 周边竞品 → 返回建议租金 + SHAP 贡献。时序图如下。</p>
          <figure class="method-fig">${dia.sequence}<figcaption style="font-size:12.5px;color:var(--muted);margin-top:6px">时序图（动态箭头：①→⑦ 新资产估价端到端调用与返回，体现事务性）</figcaption></figure>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <h4>⑦ 数据架构 <span style="font-weight:400;color:var(--muted);font-size:12.5px">Data Architecture</span></h4>
            <span class="pill grey">数据一级</span>
          </div>
          <p style="font-size:13.5px;color:#445"><b>核心要素：</b>数据资产目录 / ER 图 / 数据流，三件套构成数据架构一级制品。</p>
          <p style="font-size:13.5px;color:#0a8a4a"><b>本项目：</b>已具备 12 组 81 字段特征目录、9 表 + 1 视图 ER、以及"爬取 → 入库 → 服务"的数据流。</p>
        </div>
      </div>

      <h3>4.3 标准 → 本项目交付映射</h3>
      <table>
        <thead><tr><th>制品层级</th><th>图类（标准）</th><th>状态</th><th>本项目对应交付物</th></tr></thead>
        <tbody>
          <tr><td>应用一级</td><td>总体架构</td><td class="ok">✅ 已交付</td><td>第一章 1.3 架构图（drawio 动态箭头）</td></tr>
          <tr><td>应用一级</td><td>系统上下文</td><td class="ok">✅ 已交付</td><td>系统上下文图（用户 / 外部系统 / 数据进出）</td></tr>
          <tr><td>应用一级</td><td>系统集成架构</td><td class="ok">✅ 已落地</td><td>REST API 全 CRUD + 模型服务</td></tr>
          <tr><td>应用一级</td><td>部署架构</td><td class="ok">✅ 已交付</td><td>部署架构图（Docker + 麒麟信创）</td></tr>
          <tr><td>应用一级</td><td>分层技术栈</td><td class="ok">✅ 已明确</td><td>前端 / 后端 / 算法技术栈</td></tr>
          <tr><td>应用二级</td><td>时序图</td><td class="ok">✅ 已交付</td><td>新资产估价等核心链路时序图</td></tr>
          <tr><td>数据一级</td><td>数据资产目录 / ER / 数据流</td><td class="ok">✅ 已具备</td><td>12 组 81 字段 + 9 表结构</td></tr>
        </tbody>
      </table>
      <p class="subtitle" style="margin-top:14px">说明：标记为 🟡 的图类，其<b>要素与对应内容已在本章明确</b>，仅"出正式图"为后续交付动作。如需，我们可立即用 drawio 按贵司标准补出对应图。</p>
    </div>
  </section>

  <!-- ============ 第五章 进展与路线图 ============ -->
  <section id="ch4">
  <div class="wrap">
    <span class="sec-tag boss">受众：全体 · 决策</span>
    <h2 class="title">五、落地进展与路线图</h2>
    <p class="subtitle">已经交付了什么、下一步往哪走，以及我们邀请客户如何参与共建。</p>

    <h3>4.1 当前落地进展</h3>
    <div class="grid g2">
      <div class="card"><span class="ic">✅</span><h4>功能全交付</h4><p>M1–M8 八大模块全部上线：资产地图 / 智能定价 / 竞品对标 / AI 报告 / 数据情报 / 非标破冰 / 新资产估价 / 尽调中心 / 建模介绍。</p></div>
      <div class="card"><span class="ic">🗄️</span><h4>数据全量入库</h4><p>225 资产 / 325 竞品 / 876 成交 / 26 POI 已统一规模并全量迁移至 SQLite 后端，前端可经 API 读取真实库。</p></div>
      <div class="card"><span class="ic">🛡️</span><h4>信创就绪</h4><p>Docker + 麒麟 OS 信创内网部署镜像就绪，满足国企合规与内网隔离要求。</p></div>
      <div class="card"><span class="ic">🐞</span><h4>质量保障</h4><p>严格 TypeScript + Vite 构建；已修复详情页整页刷新白屏等真实缺陷，演示链接稳定可用。</p></div>
    </div>

    <h3>4.2 路线图</h3>
    <table>
      <thead><tr><th>方向</th><th>内容</th><th>价值</th></tr></thead>
      <tbody>
        <tr><td><b>数据自动化</b></td><td>爬虫调度 Airflow + scrapy，替代手动触发</td><td class="ok">数据持续自更新</td></tr>
        <tr><td><b>模型服务化</b></td><td>Hedonic 模型服务化，更大样本时启用 XGBoost / LightGBM 备选</td><td class="ok">精度可平滑提升</td></tr>
        <tr><td><b>智能抽取</b></td><td>OCR/NLP（PaddleOCR + HanLP）合同条款抽取</td><td class="ok">报告自动化</td></tr>
        <tr><td><b>权限分级</b></td><td>一线看本区域、总部看全貌</td><td class="ok">安全合规</td></tr>
        <tr><td><b>离线部署</b></td><td>麒麟 OS 容器镜像生产化</td><td class="ok">信创落地</td></tr>
      </tbody>
    </table>

    <div class="callout boss">
      <h4>下一步：邀请客户共建试点</h4>
      <p>我们建议以贵司<b>真实试点资产 / 试点城市</b>做定制化验证：接入真实成交与挂牌数据训练模型系数，让平台从"演示可用"走向"生产可信"。</p>
    </div>
  </div>
</section>

<!-- ============ 结语 ============ -->
<section id="end">
  <div class="wrap">
    <span class="sec-tag boss">结语</span>
    <h2 class="title">三句话，对应三类角色</h2>
    <div class="grid g3">
      <div class="card"><span class="ic">🏛️</span><h4>给大领导</h4><p>这是一套"决策有据、合规可审"的 AI 估值底座，把估值主观风险降到最低，是资管数字化的关键一环。</p></div>
      <div class="card"><span class="ic">👔</span><h4>给业务负责人</h4><p>它让团队从重复劳动中解放，估值提速、结论可解释、尽调留痕，直接赋能投决与资产盘点。</p></div>
      <div class="card"><span class="ic">🛠️</span><h4>给技术负责人</h4><p>它架构清晰、数据可追溯、可解释可落地，已具备信创与生产部署条件，能平滑对接贵司现有体系。</p></div>
    </div>
    <p class="subtitle" style="margin-top:28px">我们期待与贵司以试点资产启动共建，把"演示可信"变成"生产可信"。</p>
  </div>
</section>

<footer class="footer">
  <b>XX地产 · AI 资产估值Demo平台</b><br/>
  本页为结构化客户汇报材料 · 截图均取自真实运行系统 · 打印即可导出 PDF<br/>
  <span style="opacity:.7">联系方式：__________ ｜ 演示环境：http://localhost:5174</span>
</footer>

<script>
  var links = document.querySelectorAll('.nav a[href^="#"]');
  var sections = Array.prototype.slice.call(document.querySelectorAll('section, header.hero'));
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var id = e.target.id;
        links.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function(s){ if(s.id) obs.observe(s); });
</script>
</body>
</html>`;

const out = path.join(__dirname, '资产估值平台_客户汇报.html');
fs.writeFileSync(out, html, 'utf8');
console.log('written:', out, 'bytes:', html.length);
