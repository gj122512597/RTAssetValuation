import { useState } from 'react';
import { Card, Tag, Alert, Button, Segmented, Space, Steps, Divider, Tabs } from 'antd';
import HedonicTrainingTab from '@/components/modeling/HedonicTrainingTab';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ApartmentOutlined,
  FunctionOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

/**
 * 资产建模 · Hedonic（特征价格）方法科普页
 * 目标：让不懂 AI 建模的人也能看懂"系统是怎么给一栋楼估价的"
 * 风格：白话 + 一个贯穿全篇的具体例子 + 清晰的流程图
 */

/* ---------- 小工具：流程图节点 ---------- */
function FlowNode({
  step,
  title,
  desc,
  color = '#1f6feb',
}: {
  step?: string;
  title: string;
  desc: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center shadow-card border border-gray-100 bg-white"
      style={{ minWidth: 150 }}
    >
      {step && (
        <div
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold mb-1"
          style={{ background: color }}
        >
          {step}
        </div>
      )}
      <div className="font-semibold text-sm text-ink-900">{title}</div>
      <div className="text-[11px] text-ink-500 mt-1 leading-snug">{desc}</div>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center text-ink-300 px-1">
      <ArrowRightOutlined className="text-brand" />
      {label && <span className="text-[10px] text-ink-400 mt-0.5 whitespace-nowrap">{label}</span>}
    </div>
  );
}

/* ---------- 小工具：特征行（带影响方向） ---------- */
function FeatRow({
  name,
  value,
  effect,
}: {
  name: string;
  value: string;
  effect: 'up' | 'down' | 'flat';
}) {
  const color = effect === 'up' ? 'text-green-600' : effect === 'down' ? 'text-rose-600' : 'text-ink-400';
  const sign = effect === 'up' ? '↑ 抬高租金' : effect === 'down' ? '↓ 压低租金' : '— 中性';
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded bg-ink-50 text-sm">
      <span className="text-ink-700">
        <b>{name}</b> <span className="text-ink-400 text-xs">{value}</span>
      </span>
      <span className={color + ' text-xs font-medium'}>{sign}</span>
    </div>
  );
}

export default function ModelingIntroPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'comparative' | 'historical'>('comparative');

  /* 贯穿全篇的例子：一套"标准写字楼" */
  const example = {
    type: '写字楼',
    area: 1000,
    subway: '距地铁 600m',
    subwayDist: 600,
    age: '2015 年翻新（约 11 年）',
    cert: '产权齐全',
    deco: '标准装修',
    freeRent: 30,
    base: 2.0,
    region: 1.0,
    physical: 1.02,
    equity: 1.0,
    decoFactor: 1.0,
    frFactor: 0.975,
  };

  const finalPrice =
    example.base *
    example.region *
    example.physical *
    example.equity *
    example.decoFactor *
    example.frFactor;

  const steps = [
    {
      title: '采集特征',
      desc: '从地图/爬虫/人工录入，把一栋楼"长什么样"变成一组数字（业态、面积、地铁距离、房龄、产权…）。',
    },
    {
      title: '套用模型',
      desc: '把这组数字放进 Hedonic 公式，模型按每个特征的"权重"算出基准日租金。',
    },
    {
      title: '拆解贡献',
      desc: '用 SHAP 把总价拆开：哪几个因素让租金变贵、哪几个让它变便宜，一目了然。',
    },
    {
      title: '给出区间',
      desc: '结合数据置信度，输出"建议日租金区间"而不是一个死数字，方便谈价。',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex flex-wrap items-center gap-2 sticky top-0 z-10">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回地图
        </Button>
        <h2 className="text-lg font-semibold m-0">资产建模 · Hedonic 方法说明</h2>
        <Tag color="blue" bordered={false}>AI 定价引擎</Tag>
        <div className="ml-auto text-xs text-gray-500">点地图任意资产可查看其实测估价</div>
      </div>

      <Tabs
        defaultActiveKey="intro"
        className="px-4 md:px-6 pt-4"
        items={[
          {
            key: 'intro',
            label: 'Hedonic 方法说明',
            children: (
              <div className="max-w-5xl mx-auto space-y-5 pt-4">
        {/* 一句话定义 */}
        <Alert
          type="info"
          showIcon
          icon={<ApartmentOutlined />}
          message={'一句话看懂：把"一栋楼值多少钱"拆成一堆"看得见的特征"，再像做加法一样算出来'}
          description={'Hedonic（特征价格法）是一套很老但很实用的思路：租金不是凭空来的，而是由「位置、面积、房龄、装修、产权」等特征共同决定的。我们只是用数据把这些特征的"加分/减分"量化成了公式。'}
        />

        {/* 核心直觉 */}
        <Card title={'① 核心直觉：租金 = 基础价 × 一堆"乘子"'} size="small">
          <p className="text-sm text-ink-600 leading-relaxed mb-3">
            想象你给一栋楼的"基准日租金"打分 <b className="text-brand">2.0 元/㎡·天</b>，
            然后每个好特征往上乘一点、每个差特征往下乘一点：
          </p>
          <div className="bg-ink-50 rounded-lg p-3 text-center text-sm font-mono text-ink-800 break-all">
            日租金 = 基础价 × 区位 × 物理状况 × 产权 × 装修 × 免租期
          </div>
          <p className="text-xs text-ink-400 mt-2">
            本质上就是"好地段加钱、老房子减钱"。系统做的事，是把每个乘子背后的数字用真实成交数据"训练"出来，而不是拍脑袋。
          </p>
        </Card>

        {/* 流程图 */}
        <Card title="② 系统怎么算出价格？四步流程图" size="small">
          <div className="flex flex-wrap items-stretch justify-center gap-2 py-2">
            <FlowNode step="1" title="采集特征" desc="楼长什么样→数字" color="#0ea5e9" />
            <Arrow label="特征向量" />
            <FlowNode step="2" title="Hedonic 模型" desc="公式算基准租金" color="#1f6feb" />
            <Arrow label="基准价" />
            <FlowNode step="3" title="SHAP 拆解" desc="每个特征贡献多少" color="#8b5cf6" />
            <Arrow label="贡献图" />
            <FlowNode step="4" title="输出区间" desc="建议租金 ± 不确定度" color="#22c55e" />
          </div>
          <div className="mt-3">
            <Steps
              size="small"
              labelPlacement="vertical"
              current={-1}
              items={steps.map((s) => ({ title: s.title, description: s.desc }))}
            />
          </div>
        </Card>

        {/* 具体例子 */}
        <Card
          title="③ 举个具体例子（一套标准写字楼）"
          size="small"
          extra={<Tag color="blue">{example.type}</Tag>}
        >
          <p className="text-sm text-ink-600 mb-2">
            假设我们拿到这样一栋楼，先把它翻译成模型能懂的"特征"：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FeatRow name="业态" value="写字楼" effect="flat" />
            <FeatRow name="面积" value="1000 ㎡" effect="flat" />
            <FeatRow name="地铁距离" value={example.subway} effect="up" />
            <FeatRow name="房龄" value={example.age} effect="down" />
            <FeatRow name="产权" value={example.cert} effect="up" />
            <FeatRow name="装修" value={example.deco} effect="flat" />
            <FeatRow name="免租期" value={`${example.freeRent} 天`} effect="down" />
            <FeatRow name="基础日租金" value="2.0 元/㎡·天" effect="flat" />
          </div>

          <Divider className="my-3" />

          <div className="text-sm text-ink-600 mb-2">套进公式（区位满分、产权齐全、标准装修）：</div>
          <div className="bg-ink-50 rounded-lg p-3 text-sm font-mono text-ink-800 break-all">
            日租金 = 2.0 × 1.00(区位) × 1.02(房况) × 1.00(产权) × 1.00(装修) × 0.975(免租)
            <div className="mt-1 font-bold text-brand">≈ {finalPrice.toFixed(2)} 元/㎡·天</div>
          </div>
          <p className="text-xs text-ink-400 mt-2">
            这栋 1000㎡ 的楼，月租潜力约 <b>¥{(finalPrice * example.area * 30).toLocaleString()}</b>。
            注意免租期会"打折"——免租越长，等效日租金越低，这正是公式里 0.975 乘子的含义。
          </p>
        </Card>

        {/* 两种方法 */}
        <Card
          title="④ 两种定价方法，本质都是 Hedonic"
          size="small"
          extra={
            <Segmented
              value={method}
              onChange={(v) => setMethod(v as 'comparative' | 'historical')}
              options={[
                { label: '市场比较法', value: 'comparative' },
                { label: '历史数据法', value: 'historical' },
              ]}
            />
          }
        >
          {method === 'comparative' ? (
            <div className="space-y-2">
              <p className="text-sm text-ink-600">
                <b>市场比较法（12 维特征）</b>：把周边竞品、交通、房龄、产权、装修等
                <b> 12 个特征</b>一起放进对数线性回归
                <span className="font-mono text-ink-800"> ln(租金) = β₀ + β₁·地铁 + β₂·房龄 + …</span>。
              </p>
              <ul className="text-xs text-ink-500 list-disc pl-5 space-y-1">
                <li>适合：周边有充足竞品、想对标市场的资产。</li>
                <li>训练数据：225 条资产 × 12 维特征，交叉验证 R² ≈ 0.89。</li>
                <li>输出区间更窄（±12%），因为参考信息更丰富。</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-ink-600">
                <b>历史数据法（4 维特征）</b>：只用自己的
                <b>历史成交均价 + 装修 + 免租期</b>等少量特征回归，适合竞品稀少的资产。
              </p>
              <ul className="text-xs text-ink-500 list-disc pl-5 space-y-1">
                <li>适合：周边竞品少、但自身有历史成交记录的资产。</li>
                <li>交叉验证 R² ≈ 0.85，区间 ±16%（历史数据有滞后）。</li>
                <li>特征更少 = 更稳，但精度略低于比较法。</li>
              </ul>
            </div>
          )}
          <Alert
            className="mt-3"
            type="success"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message={'为什么用 Hedonic 而不是黑盒 AI？'}
            description={'公式可解释、每个系数都能审计；核价人员能清楚说出"租金高是因为地铁近"，监管和客户都更容易信服。'}
          />
        </Card>

        {/* SHAP 解读 */}
        <Card title={'⑤ SHAP：价格是怎么被"掰开"的'} size="small">
          <div className="flex items-start gap-3">
            <EyeOutlined className="text-brand text-xl mt-1" />
            <div className="text-sm text-ink-600 leading-relaxed">
              SHAP 是一种"分功劳"的技术：最终租金是大家（各特征）一起贡献的，
              SHAP 公平地算出<b>每个特征让价格涨了多少、降了多少</b>。
              <br />
              在上例里，<b className="text-green-600">地铁近 +0.15</b>、<b className="text-rose-600">房龄老 −0.08</b>、
              <b className="text-rose-600">免租 30 天 −0.05</b>…… 这些数字就是 SHAP 贡献，
              在资产详情页的"定价面板"里以条形图展示，让涨价/降价原因一目了然。
            </div>
          </div>
        </Card>

        {/* 去实操 */}
        <Card size="small" className="bg-brand-50 border-brand-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-ink-700">
              <BankOutlined className="text-brand mr-1" />
              看懂了？回到地图点任意一栋资产，看系统是怎么给它估价的。
            </div>
            <Space>
              <Button onClick={() => navigate('/')}>返回地图</Button>
              <Button type="primary" icon={<FunctionOutlined />} onClick={() => navigate('/valuation/new')}>
                试试新资产估价
              </Button>
            </Space>
          </div>
        </Card>
              </div>
            ),
          },
          {
            key: 'training',
            label: 'Hedonic 模型训练',
            children: <HedonicTrainingTab />,
          },
        ]}
      />
    </div>
  );
}
