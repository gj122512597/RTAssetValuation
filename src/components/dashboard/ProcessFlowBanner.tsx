import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApartmentOutlined,
  CloudDownloadOutlined,
  BranchesOutlined,
  LineChartOutlined,
  RightOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';

interface Counts {
  assets: number;
  comps: number;
  tasks: number;
}

interface Stage {
  key: string;
  title: string;
  icon: ReactNode;
  desc: (c: Counts) => string;
  /** 可点击跳转的路由；缺省则为信息展示（如依赖地图资产） */
  to?: string;
  hint?: string;
}

const STAGES: Stage[] = [
  {
    key: 'crawl',
    title: '数据采集',
    icon: <CloudDownloadOutlined />,
    desc: (c) => `${c.tasks} 个爬虫任务`,
    to: '/intel',
  },
  {
    key: 'model',
    title: '资产建模',
    icon: <BranchesOutlined />,
    desc: (c) => `${c.assets} 资产 · 12 组特征`,
    hint: 'Hedonic 方法',
    to: '/modeling-intro',
  },
  {
    key: 'price',
    title: '智能定价',
    icon: <LineChartOutlined />,
    desc: () => '比较法·历史法',
    to: '/valuation/new',
  },
];

/**
 * 主页顶部「业务主流程」：单行展示品牌 + 端到端 3 阶段流水线 + 数据时间戳，
 * 与原品牌栏合并为一行，避免堆叠遮挡地图视野。
 * 数据采集=数据情报站、智能定价=新资产估价（已合并）、数据入库已并入采集。
 * 计数实时取自 assetStore（loadAll 已在主页挂载时执行）。
 */
export default function ProcessFlowBanner() {
  const navigate = useNavigate();
  const assets = useAssetStore((s) => s.assets.length);
  const comps = useAssetStore((s) => s.competitors.length);
  const tasks = useAssetStore((s) => s.crawlerTasks.length);
  const counts: Counts = { assets, comps, tasks };

  return (
    <div className="bg-white/95 rounded-lg shadow-card flex items-center gap-3 px-3 py-2">
      {/* 品牌（固定不滚） */}
      <span className="flex shrink-0 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-sm">
          XX
        </div>
        <span className="text-sm font-bold text-ink-900">XX地产</span>
      </span>

      <div className="h-7 w-px shrink-0 bg-gray-200" />

      {/* 流程标题 + 3 阶段（单行，不滚动） */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* 流程标题（固定不滚） */}
        <span className="flex shrink-0 items-center gap-2 pr-1 text-ink-900">
          <ApartmentOutlined className="text-base text-brand" />
          <span className="text-sm font-semibold">业务主流程</span>
        </span>

        {/* 3 阶段流水线 */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex shrink-0 items-center gap-1.5">
              <div
                onClick={() => s.to && navigate(s.to)}
                title={s.hint}
                className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors ${
                  s.to
                    ? 'cursor-pointer border-slate-200 hover:border-brand hover:bg-brand-50'
                    : 'cursor-default border-slate-100 bg-slate-50'
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-ink-500 group-hover:text-brand">{s.icon}</span>
                <div className="whitespace-nowrap leading-tight">
                  <div className="text-xs font-semibold text-ink-900">{s.title}</div>
                  <div className="text-[10px] text-ink-500">
                    {s.desc(counts)}
                    {s.hint && <span className="ml-1 text-ink-400">· {s.hint}</span>}
                  </div>
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <RightOutlined className="shrink-0 text-ink-300" style={{ fontSize: 10 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
