const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

// 四张流程图（由 make_svgs.py 手写生成，零依赖、文字对比度强制保证，含动态箭头虚线边）
const bizloopSvg  = read('diagrams/bizloop.svg');   // 端到端业务闭环
const sequenceSvg = read('diagrams/sequence.svg');  // 新资产估价时序图
const sysctxSvg   = read('diagrams/syscontext.svg'); // 系统上下文
const opstopSvg   = read('diagrams/opstop.svg');    // 部署架构

// 整体系统技术架构图（make_svgs.py 手写生成，文字对比度已内建，无 switch/light-dark 依赖）
const archSvg = read('arch.svg');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>XX地产 · AI 资产估值Demo平台 — 核心汇报</title>
<style>
  :root{
    --navy:#0f2742; --navy2:#163a5f; --navy3:#1e4d7b;
    --teal:#14b8a6; --blue:#2f80ed; --gold:#e0a82e;
    --bg:#eef2f7; --card:#ffffff; --ink:#1f2d3d; --muted:#66788f; --line:#e2e8f0;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;
    color:var(--ink); background:var(--bg); line-height:1.7; -webkit-font-smoothing:antialiased;
  }
  a{color:inherit;text-decoration:none}

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

  section{padding:64px 0; border-bottom:1px solid var(--line)}
  .wrap{max-width:1120px; margin:0 auto; padding:0 28px}
  .sec-tag{display:inline-block; font-size:12px; font-weight:700; letter-spacing:1px; color:#fff; background:var(--navy3); padding:4px 12px; border-radius:20px; margin-bottom:14px}
  h2.title{font-size:30px; font-weight:800; color:var(--navy); letter-spacing:.5px; margin-bottom:10px}
  .subtitle{color:var(--muted); font-size:15px; margin-bottom:34px; max-width:860px}
  h3{font-size:20px; color:var(--navy2); margin:34px 0 14px; font-weight:700}
  p{margin:12px 0; color:#33424f}

  .hero{
    background:radial-gradient(1200px 500px at 80% -10%,rgba(20,184,166,.25),transparent),
               linear-gradient(135deg,var(--navy) 0%,var(--navy2) 60%,#0c3550 100%);
    color:#eaf2fb; padding:72px 0 64px;
  }
  .kicker{color:var(--teal); font-weight:700; letter-spacing:3px; font-size:13px; text-transform:uppercase}
  .hero h1{font-size:42px; font-weight:800; margin:14px 0 10px; line-height:1.25; color:#fff}
  .hero .tagline{font-size:19px; color:#bcd2e6; max-width:820px}
  .stats{display:flex; flex-wrap:wrap; gap:16px; margin-top:36px}
  .stat{background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); border-radius:14px; padding:18px 22px; min-width:150px; flex:1}
  .stat b{display:block; font-size:34px; font-weight:800; color:#fff; line-height:1.1}
  .stat span{font-size:13.5px; color:#a9c2d8}

  .grid{display:grid; gap:18px}
  .g2{grid-template-columns:repeat(2,1fr)} .g4{grid-template-columns:repeat(4,1fr)} .g5{grid-template-columns:repeat(5,1fr)}
  .card{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px; box-shadow:0 1px 3px rgba(16,39,66,.05)}
  .card h4{font-size:16px; color:var(--navy); margin-bottom:8px; font-weight:700}
  .card .ic{font-size:22px; margin-bottom:8px; display:block}
  .card p{font-size:14px; color:#445; margin:0}

  table{width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(16,39,66,.05)}
  th,td{padding:12px 14px; text-align:left; border-bottom:1px solid var(--line)}
  th{background:var(--navy); color:#fff; font-weight:600; font-size:13px}
  tr:last-child td{border-bottom:none}
  td b{color:var(--navy2)}
  .ok{color:#0a8a4a; font-weight:700}

  figure{margin:18px 0; background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(16,39,66,.06)}
  figure figcaption{font-size:13.5px; color:var(--muted); padding:14px 18px; background:#fafcfe; border-top:1px solid var(--line)}
  figure figcaption b{color:var(--navy2)}

  .callout{background:#f4fbf9; border:1px solid #bdeedd; border-left:5px solid var(--teal); border-radius:12px; padding:18px 20px; margin:18px 0}
  .callout h4{color:var(--navy); margin-bottom:6px; font-size:16px}
  .callout p{margin:0; font-size:14.5px; color:#3a4a58}

  .formula{background:#0f2742; color:#eaf2fb; border-radius:12px; padding:20px 22px; font-family:"SF Mono",Consolas,Menlo,monospace; font-size:15px; line-height:1.9; overflow-x:auto}
  .formula .v{color:var(--teal)} .formula .c{color:#9fd0ff}

  ul.clean{list-style:none; margin:14px 0}
  ul.clean li{padding:9px 0 9px 26px; position:relative; border-bottom:1px dashed var(--line); font-size:14.5px}
  ul.clean li:before{content:"▸"; position:absolute; left:4px; color:var(--teal); font-weight:800}
  ul.clean li:last-child{border-bottom:none}

  .pill{display:inline-block; background:#eaf3fb; color:var(--navy3); border-radius:20px; padding:3px 11px; font-size:12.5px; font-weight:600; margin:3px 4px 3px 0}

  .footer{background:var(--navy); color:#bcccdb; padding:40px 0; font-size:13.5px; text-align:center}
  .footer b{color:#fff}

  @media(max-width:980px){.g4,.g5{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:820px){.g2,.g4,.g5{grid-template-columns:1fr}}

  @media print{
    .nav{display:none}
    section{page-break-inside:avoid; border-bottom:none; padding:30px 0}
    figure, .card{break-inside:avoid}
    body{background:#fff}
  }

  /* 架构/流程图动态箭头：drawio 导出虚线边 + CSS 流动动画 */
  .arch-svg-wrap svg{width:100%;height:auto;display:block}
  @keyframes archDash{ to { stroke-dashoffset:-12; } }
  .arch-svg-wrap svg path[stroke-dasharray]{ animation:archDash .9s linear infinite; }
  @media (prefers-reduced-motion: reduce){ .arch-svg-wrap svg path[stroke-dasharray]{ animation:none; } }
</style>
</head>
<body>

<nav class="nav">
  <div class="brand">AI 资产估值平台 <small>核心汇报</small></div>
  <a href="#features">一·核心功能</a>
  <a href="#model">二·AI 模型解释</a>
  <a href="#arch">三·系统技术架构</a>
  <span class="spacer"></span>
  <a class="print" href="javascript:void(0)" onclick="window.print()">打印 / 导出 PDF</a>
</nav>

<!-- ============ HERO ============ -->
<header class="hero" id="top">
  <div class="wrap">
    <div class="kicker">XX地产 · 资产估值与尽调数字化</div>
    <h1>AI 资产估值Demo平台</h1>
    <p class="tagline">面向资管、投决与尽调团队的 AI 辅助资产估值平台，提供<b style="color:#fff">可解释、可追溯</b>的定价结论与证据链。</p>
    <div class="stats">
      <div class="stat"><b>225</b><span>在管资产</span></div>
      <div class="stat"><b>325</b><span>可比竞品挂牌</span></div>
      <div class="stat"><b>876</b><span>历史成交记录</span></div>
      <div class="stat"><b>分钟级</b><span>新资产出建议租金</span></div>
    </div>
  </div>
</header>

<!-- ============ 一、核心功能 ============ -->
<section id="features">
  <div class="wrap">
    <span class="sec-tag">核心功能</span>
    <h2 class="title">一、核心功能</h2>
    <p class="subtitle">平台覆盖资产盘点、智能估值、竞品对标、尽职调查至投决报告的全流程，并形成数据闭环。下图为端到端业务闭环示意。</p>

    <figure class="arch-svg-wrap">
      ${bizloopSvg}
      <figcaption><b>端到端业务闭环</b>：① 资产盘点 → ② 智能估值 → ③ 竞品对标 → ④ 尽职调查 → ⑤ 投决 / 报告；估值结果、竞品与成交数据回流至建模环节，驱动模型持续迭代，构成闭环。</figcaption>
    </figure>

    <div class="grid g5" style="margin-top:18px">
      <div class="card"><span class="ic">🗺️</span><h4>① 资产盘点</h4><p>全域 GIS 地图与资产台账，按业态 / 区域 / 批次分层聚合，快速锁定标的。</p></div>
      <div class="card"><span class="ic">🧮</span><h4>② 智能估值</h4><p>Hedonic 定价模型，录入特征后分钟级输出建议租金与置信区间。</p></div>
      <div class="card"><span class="ic">🔍</span><h4>③ 竞品对标</h4><p>自动检索周边竞品，雷达 + 表格并列，SHAP 拆解价格差异来源。</p></div>
      <div class="card"><span class="ic">📑</span><h4>④ 尽职调查</h4><p>尽调任务与风险清单集中管理，证据链全程留痕、可追溯。</p></div>
      <div class="card"><span class="ic">📊</span><h4>⑤ 投决报告</h4><p>汇总定价结论与对标分析，一键生成投决 / 汇报材料。</p></div>
    </div>
  </div>
</section>

<!-- ============ 二、AI 模型解释 ============ -->
<section id="model">
  <div class="wrap">
    <span class="sec-tag">AI 模型解释</span>
    <h2 class="title">二、AI 模型解释</h2>
    <p class="subtitle">从特征来源、建模方法到结论解释，全链路透明、可审计、可落地。</p>

    <h3>2.1 输入特征：12 组 81 字段</h3>
    <p>特征按数据来源与业务语义划分为 12 组，共 81 个字段，每条均标注数据来源与模型输入标记，保留原始字段以便回溯。</p>
    <div style="margin:14px 0">
      <span class="pill">① 基础属性</span><span class="pill">② 区位特征</span><span class="pill">③ 物理状态</span><span class="pill">④ 历史交易</span><span class="pill">⑤ OCR 报告</span><span class="pill">⑥ 竞品挂牌</span><span class="pill">⑦ 流拍记录</span><span class="pill">⑧ 人工调研</span><span class="pill">⑨ POI 周边</span><span class="pill">⑩ 时间戳</span><span class="pill">⑪ 交易条件</span><span class="pill">⑫ 时间特征</span>
    </div>

    <h3>2.2 定价模型：Hedonic 对数线性回归</h3>
    <div class="formula">
      ln(租金) <span class="c">=</span> β₀ <span class="c">+</span> Σ βᵢ · xᵢ<br/>
      <span class="v">prediction</span> = exp(β₀ + Σ βᵢ·(xᵢ − meanᵢ))   <span class="c"># 偏效应分解 → SHAP 贡献</span>
    </div>
    <table>
      <thead><tr><th>方法</th><th>输入维度</th><th>算法</th><th>拟合优度 R²</th></tr></thead>
      <tbody>
        <tr><td><b>市场比较法</b></td><td>9 维（地铁距离 / 成新 / 装修 / 权证 / 学区 / 商密 / CBD / 免租…）</td><td>Hedonic 对数线性</td><td class="ok">≈ 0.92</td></tr>
        <tr><td><b>历史数据法</b></td><td>4 维（基准价 / 装修 / 装修年限 / 免租）</td><td>Hedonic 对数线性</td><td class="ok">≈ 0.85</td></tr>
      </tbody>
    </table>
    <div class="callout">
      <h4>为何采用回归而非纯深度学习</h4>
      <p>小样本下表现稳健、模型系数可解释、推断过程可审计。在国企合规场景中，模型的可解释性优先于极致的预测精度。模型系数存储于后端，可经 API 覆盖为真实训练结果，前端无需改动。</p>
    </div>

    <h3>2.3 可解释性：SHAP 边际贡献</h3>
    <p>每一个定价结论均可分解为"哪些特征拉高 / 拉低了价格、各贡献多少"。示例：区位 +0.8 元/㎡·天、物理状态 −0.3 元/㎡·天……每一行均含<b>中文业务名 + 解释 + 取值来源</b>，业务人员可直接解读，并满足监管审计要求。</p>

    <h3>2.4 非标资产：输出参考区间而非精确值</h3>
    <ul class="clean">
      <li>自动判定非标（空置超 180 天 / 成新≤3 / 地铁&gt;5000m / 军产遗留等）。</li>
      <li>输出<b>参考区间</b>而非精确值，残值 / 运输系数支持人工调节。</li>
      <li>下钻 4 个最相似案例，辅助一线人工判断，在引入 AI 辅助的同时保留人工决策的责任边界。</li>
    </ul>

    <h3>2.5 一次估价的计算链路（时序图）</h3>
    <figure class="arch-svg-wrap">
      ${sequenceSvg}
      <figcaption><b>新资产估价调用时序</b>：前端录入特征 → 请求模型服务 → 读取 Hedonic 系数 → 检索周边竞品 → 计算 SHAP 贡献 → 输出建议日租金（中心值 + 区间）与置信度。</figcaption>
    </figure>
  </div>
</section>

<!-- ============ 三、系统技术架构 ============ -->
<section id="arch">
  <div class="wrap">
    <span class="sec-tag">系统技术架构</span>
    <h2 class="title">三、系统技术架构</h2>
    <p class="subtitle">从总体架构、系统上下文到部署形态的三层视图（图中箭头为动态数据 / 调用流向）。</p>

    <h3>3.1 总体架构</h3>
    <figure class="arch-svg-wrap">
      ${archSvg}
      <figcaption>用户层 → 前端应用层（React 18 + TS + Vite + Antd）→ 数据后端层（Express + SQLite，REST API 全 CRUD）↔ 外部数据来源（贝壳 / 58 / 链家 / 房天下爬虫、政府公开数据、宏观 GIS）；AI 模型层（Hedonic 定价 + SHAP 解释）与前后端双向联动。</figcaption>
    </figure>

    <h3>3.2 系统上下文</h3>
    <figure class="arch-svg-wrap">
      ${sysctxSvg}
      <figcaption>界定系统边界：使用者（业务负责人 / 技术负责人 / 决策层）、外部系统（爬虫数据源、政府公开数据、宏观 GIS）与系统的输入 / 输出事件。</figcaption>
    </figure>

    <h3>3.3 部署架构</h3>
    <figure class="arch-svg-wrap">
      ${opstopSvg}
      <figcaption>信创内网（麒麟 OS 服务器，Docker 多阶段镜像），由 Nginx 托管前端并反向代理至后端服务；后端对接 SQLite 与爬虫 / 模型服务，外部经防火墙访问。</figcaption>
    </figure>

    <div class="grid g2" style="margin-top:18px">
      <div class="card"><span class="ic">🐳</span><h4>部署形态</h4><p>Docker 多阶段构建（nginx 托管，约 30–40MB）；支持麒麟 OS 信创内网部署；SPA fallback、gzip、/healthz 健康检查齐备。</p></div>
      <div class="card"><span class="ic">🔌</span><h4>对接与扩展</h4><p>数据后端 REST API 全 CRUD；数据量增大可平滑迁移 PostgreSQL + PostGIS；模型可服务化升级（XGBoost / LightGBM 备选）。</p></div>
    </div>
  </div>
</section>

<footer class="footer">
  <b>XX地产 · AI 资产估值Demo平台</b><br/>
  本页为核心汇报材料（功能 / 模型 / 架构）· 全文以流程图与文字叙述，系统功能可现场演示 · 打印即可导出 PDF
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

const out = path.join(__dirname, '资产估值平台_核心汇报.html');
fs.writeFileSync(out, html, 'utf8');
console.log('written:', out, 'bytes:', html.length);
