import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Result,
  Tag,
  Alert,
  Spin,
  Statistic,
  Switch,
  Drawer,
  Space,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import MapView from '@/components/map/MapView';
import AssetPortraitCard from '@/components/detail/AssetPortraitCard';
import AssetSummaryBar from '@/components/detail/AssetSummaryBar';
import HistoryTrendCard from '@/components/detail/HistoryTrendCard';
import DueDiligenceOverview from '@/components/due_diligence/DueDiligenceOverview';
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

  const openFormula = (model: PricingModel, input: ValuationInput) => {
    setFormulaPayload({ model, input });
    setFormulaOpen(true);
  };

  const openReport = (input: ValuationInput) => {
    setReportCtx(input);
    setReportOpen(true);
  };

  const verdict = useMemo(() => {
    // 简易：当非标时显示破冰；通过 import 复用 utilities
    const t = asset;
    return (
      t.days_vacant > 180 ||
      t.features.condition_score <= 3 ||
      t.features.subway_distance > 5000 ||
      (t.hidden_risks ?? []).includes('military_legacy')
    );
  }, [asset]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部 Header：信息行 */}
      <div className="bg-white border-b border-ink-100 px-6 py-2.5 flex items-center gap-3">
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
        <span className="text-xs text-ink-500 truncate">{asset.address}</span>
        <span className="ml-auto text-[11px] text-ink-500">
          半径 <b className="text-brand">{radius}km</b> · 竞品{' '}
          <Switch
            size="small"
            checked={showCompetitors}
            onChange={setShowCompetitors}
          />
        </span>
      </div>

      {/* 操作行（拆出） */}
      <div className="bg-white border-b border-ink-100 px-6 py-2 flex items-center justify-end gap-2">
        <Button
          size="small"
          icon={<DatabaseOutlined />}
          onClick={() => navigate('/intel')}
        >
          情报站
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<FileTextOutlined />}
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

      {/* 顶部摘要条（始终显示） */}
      <AssetSummaryBar asset={asset} />

      <div className="flex-1 grid grid-cols-5 gap-0 overflow-hidden">
        {/* 左 60%：地图 + 竞品对比 */}
        <div className="col-span-3 relative bg-slate-100 border-r border-gray-200 flex flex-col">
          <div className="flex-1 relative">
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
          </div>

          {/* 下方：竞品对标 */}
          <div className="bg-white border-t border-gray-200 max-h-[40%] overflow-y-auto">
            <CompetitionRadar asset={asset} />
          </div>
        </div>

        {/* 右 40%：画像 + 定价 + 派生 */}
        <div className="col-span-2 overflow-y-auto p-4 space-y-3">
          <AssetPortraitCard asset={asset} />

          <HistoryTrendCard asset={asset} />

          <DueDiligenceOverview asset={asset} />

          <AiFeaturesCard asset={asset} />

          <ValuationPanel asset={asset} onOpenFormula={openFormula} />

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

          {/* 快速统计 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border rounded-md p-3">
              <Statistic
                title={<span className="text-xs">面积</span>}
                value={asset.area}
                suffix={<span className="text-xs">㎡</span>}
                valueStyle={{ fontSize: 18 }}
              />
            </div>
            <div className="bg-white border rounded-md p-3">
              <Statistic
                title={<span className="text-xs">月租潜力</span>}
                value={asset.monthly_rent ?? 0}
                prefix="¥"
                valueStyle={{ fontSize: 16 }}
              />
            </div>
            <div className="bg-white border rounded-md p-3">
              <Statistic
                title={<span className="text-xs">出租率</span>}
                value={(asset.occupancy_rate ?? 0) * 100}
                precision={0}
                suffix="%"
                valueStyle={{ fontSize: 18 }}
              />
            </div>
          </div>
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
