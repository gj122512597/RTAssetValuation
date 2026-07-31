import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Result,
  Tag,
  Alert,
  Spin,
  Drawer,
  Space,
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import MapView from '@/components/map/MapView';
import AssetPortraitCard from '@/components/detail/AssetPortraitCard';
import AssetSummaryBar from '@/components/detail/AssetSummaryBar';
import HistoryTrendCard from '@/components/detail/HistoryTrendCard';

import AiFeaturesCard from '@/components/detail/AiFeaturesCard';
import ValuationPanel from '@/components/detail/ValuationPanel';
import FormulaModal from '@/components/detail/FormulaModal';
import CompetitionRadar from '@/components/detail/CompetitionRadar';
import ReportPreview from '@/components/report/ReportPreview';
import ComplianceStrip from '@/components/report/ComplianceStrip';
import SimilarCasesPanel from '@/components/detail/SimilarCasesPanel';
import type { Asset, PricingModel } from '@/types';
import type { ValuationInput } from '@/utils/pricingModels';
import { pickCompsInRadius } from '@/utils/shap';
import { assetClassOf } from '@/utils/assetClass';
import type { CompetitorForRadar } from '@/types';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assets = useAssetStore((s) => s.assets);
  const competitors = useAssetStore((s) => s.competitors);
  const loading = useAssetStore((s) => s.loading);
  const error = useAssetStore((s) => s.error);
  const loadAll = useAssetStore((s) => s.loadAll);
  const setSelectedId = useAssetStore((s) => s.setSelectedAssetId);
  const radius = useAssetStore((s) => s.compRadiusKm);
  const showCompetitors = useAssetStore((s) => s.showCompetitors);
  const setShowCompetitors = useAssetStore((s) => s.setShowCompetitors);

  const [formulaOpen, setFormulaOpen] = useState(false);
  const [formulaPayload, setFormulaPayload] = useState<{
    model: PricingModel;
    input: ValuationInput;
  } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCtx, setReportCtx] = useState<ValuationInput | null>(null);

  useEffect(() => {
    if (assets.length === 0) void loadAll();
  }, [assets.length, loadAll]);

  const asset = useMemo(
    () => (id ? assets.find((a) => a.id === id) : undefined),
    [id, assets]
  );

  const compsInRadius = useMemo<CompetitorForRadar[]>(
    () => (asset ? pickCompsInRadius(asset, competitors, radius) : []),
    [asset, competitors, radius]
  );

  const verdict = useMemo(() => {
    if (!asset) return false;
    const t = asset;
    return (
      t.days_vacant > 180 ||
      t.features.condition_score <= 3 ||
      t.features.subway_distance > 5000 ||
      (t.hidden_risks ?? []).includes('military_legacy')
    );
  }, [asset]);

  if (loading && !asset) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" tip="加载资产数据中…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Result
          status="404"
          title="404 - Asset Not Found"
          subTitle={`未找到 id 为 "${id}" 的资产`}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  const cls = assetClassOf(asset);

  const openFormula = (model: PricingModel, input: ValuationInput) => {
    setFormulaPayload({ model, input });
    setFormulaOpen(true);
  };

  const openReport = (input: ValuationInput) => {
    setReportCtx(input);
    setReportOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 顶部 Header：资产名称 + 关键 meta + 主操作 */}
      <div className="sticky top-0 z-40 bg-white border-b border-ink-100 px-6 py-2.5 flex items-center gap-3">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            setSelectedId(null);
            navigate('/');
          }}
        >
          返回资产地图
        </Button>
        <h2 className="text-lg font-semibold m-0">{asset.name}</h2>
        <Tag color="blue">{asset.type.toUpperCase()}</Tag>
        <Tag color={cls === 'non_standard' ? 'orange' : 'green'}>
          {cls === 'non_standard' ? '非标资产' : '标准资产'}
        </Tag>
        <span className="text-xs text-ink-500 truncate max-w-[36%]">{asset.address}</span>
        <Button
          size="small"
          type="primary"
          icon={<FileTextOutlined />}
          className="ml-auto"
          onClick={() => {
            setReportCtx({
              businessType: asset.type,
              decoration: asset.decoration_level ?? 'standard',
              freeRentDays: asset.default_free_rent_days ?? 30,
            });
            setReportOpen(true);
          }}
        >
          生成报告
        </Button>
      </div>

      {/* 资产画像：整合 KPI 摘要 + 基础信息 + 画像卡片，置于资产名称下方（完整展示，不内滚） */}
      <section className="bg-white border-b border-ink-100 flex-shrink-0">
        <AssetSummaryBar asset={asset} />
        <div className="px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-500">
          <span>· {asset.region}</span>
          <span>· {asset.area.toLocaleString()} ㎡</span>
          <span>· 出租率 {((asset.occupancy_rate ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="px-6 pb-3">
          <AssetPortraitCard asset={asset} />
        </div>
      </section>

      <div className="grid grid-cols-5 gap-0 overflow-hidden">
        {/* 左 40%：地图 + 竞品对标（二者双向联动，就近陈列） */}
        <div className="col-span-2 relative bg-slate-100 border-r border-gray-200 flex flex-col">
          <div className="h-[55vh] flex-shrink-0 relative">
            <MapView
              focusAsset={asset}
              onMarkerClick={(a) => {
                setSelectedId(a.id);
                if (a.id !== asset.id) navigate(`/asset/${a.id}`);
              }}
              detailMode={showCompetitors}
              detailRadiusKm={radius}
              detailCompetitors={showCompetitors ? compsInRadius : undefined}
            />
            {/* 地图就近控制条：竞品显隐（P2） */}
            <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur rounded shadow px-2.5 py-1.5 flex items-center gap-2 text-xs">
              <span className="text-ink-500">竞品</span>
              <Switch
                size="small"
                checked={showCompetitors}
                onChange={setShowCompetitors}
              />
            </div>
          </div>

          {/* 竞品对标分析（与地图双向联动，置于地图下方就近陈列，整页滚动不内滚） */}
          <div className="bg-white border-t border-gray-200">
            <CompetitionRadar asset={asset} />
          </div>
        </div>

        {/* 右 60%：结论（定价）先行 + 支撑特征 */}
        <div className="col-span-3 p-4 space-y-4">
          {/* —— 结论区：智能定价面板，用户首屏先看结论 —— */}
          <section className="rounded-xl ring-2 ring-brand/30 bg-brand-50/40 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-white bg-brand rounded px-2 py-0.5 leading-5">
                结论
              </span>
              <span className="text-xs text-ink-500">资产定价结果先行，下方为特征支撑</span>
            </div>
            <ValuationPanel asset={asset} onOpenFormula={openFormula} />
            {/* P3：可信度来源闭环提示，引导用户追溯依据 */}
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-500 border-t border-brand/20 pt-2">
              <span>
                基于 <b className="text-brand">{compsInRadius.length}</b> 个圈内竞品 ·{' '}
                <b className="text-brand">{asset.historical_transactions?.length ?? 0}</b> 笔历史成交测算
              </span>
              <Button
                type="link"
                size="small"
                className="ml-auto !p-0"
                onClick={() =>
                  openFormula(useAssetStore.getState().pricingModel, {
                    businessType: asset.type,
                    decoration: asset.decoration_level ?? 'standard',
                    freeRentDays: asset.default_free_rent_days ?? 30,
                  })
                }
              >
                查看方法论 ›
              </Button>
            </div>
          </section>

          {/* —— 支撑特征区：历史 / AI特征 等支撑结论 —— */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-ink-500 tracking-wide">
                支撑特征
              </span>
              <div className="flex-1 h-px bg-ink-100" />
            </div>

            <HistoryTrendCard asset={asset} />

            <AiFeaturesCard asset={asset} />

            {verdict && (
              <SimilarCasesPanel asset={asset} />
            )}

            {/* 合规性审查摘要（M3 P4-2） */}
            <ComplianceStrip
              asset={asset}
              input={{
                businessType: asset.type,
                decoration: asset.decoration_level ?? 'standard',
                freeRentDays: asset.default_free_rent_days ?? 30,
              }}
              model={useAssetStore.getState().pricingModel}
            />
          </section>
        </div>
      </div>

      {/* 公式溯源弹窗 */}
      {formulaPayload && (
        <FormulaModal
          open={formulaOpen}
          onClose={() => setFormulaOpen(false)}
          asset={asset}
          model={formulaPayload.model}
          input={formulaPayload.input}
        />
      )}

      {/* 报告预览 Drawer */}
      <Drawer
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={
          <Space>
            <ThunderboltOutlined />
            <span>{asset.name} · 报告工厂</span>
          </Space>
        }
        width={720}
        extra={
          <Space>
            <Button onClick={() => setReportOpen(false)}>关闭</Button>
            <Button type="primary" onClick={() => window.print()}>
              打印 / 导出 PDF
            </Button>
          </Space>
        }
      >
        {reportCtx && (
          <ReportPreview
            asset={asset}
            input={reportCtx}
            model={useAssetStore.getState().pricingModel}
          />
        )}
      </Drawer>
    </div>
  );
}
