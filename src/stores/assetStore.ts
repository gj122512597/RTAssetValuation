import { create } from 'zustand';
import type {
  Asset,
  BusinessType,
  Competitor,
  CrawlerTask,
  CurrentUser,
  DueDiligenceCheck,
  HiddenRiskTag,
  PoiDataset,
  PricingModel,
  ReceivedBatch,
  RegionLayerMode,
  ValuationLogic,
} from '@/types';
import assetsUrl from '@/mocks/assets.json?url';
import valuationUrl from '@/mocks/valuation_logic.json?url';
import competitorsUrl from '@/mocks/competitors.json?url';
import poiUrl from '@/mocks/poi.json?url';
import crawlerTasksUrl from '@/mocks/crawler_tasks.json?url';
import intakeAssetsUrl from '@/mocks/intake_assets.json?url';
import { generateAiFeatures } from '@/utils/aiFeaturesMock';
import { generateAssets, generateCompetitors } from '@/utils/extendedMockGenerator';
import { injectHistoricalTransactions } from '@/utils/historicalTransactionMock';
import type { IntakeAsset } from '@/types';
import { getPriceBucket } from '@/components/map/AssetMarker';

interface AssetState {
  // 数据
  assets: Asset[];
  competitors: Competitor[];
  valuationLogic: ValuationLogic | null;
  poi: PoiDataset | null;
  crawlerTasks: CrawlerTask[];

  loading: boolean;
  error: string | null;

  // 选中
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  /** 竞品选中 + hover（详情页用，与地图 / 表格联动） */
  selectedCompetitorId: string | null;
  hoveredCompetitorId: string | null;

  // M1: 图层与过滤
  selectedBusinessTypes: BusinessType[];
  selectedBatches: ReceivedBatch[];
  selectedPriceBuckets: string[];
  regionLayer: RegionLayerMode;
  currentUser: CurrentUser;

  // M2: 详情页专用
  pricingModel: PricingModel;
  /** 报告中引用的方法（至少 1 种，最多 2 种） */
  pricingModelsUsed: PricingModel[];
  compRadiusKm: number;

  /** 尽调进度（按 asset.id 索引） */
  dueDiligence: Record<string, DueDiligenceCheck[]>;
  /** 资产接收 / 新建（待尽调）队列 */
  intakeAssets: IntakeAsset[];
  showCompetitors: boolean;
  manualRisks: Record<string, HiddenRiskTag[]>;

  // M4: POI 控制
  showMetro: boolean;
  showDistricts: boolean;
  showHeatmap: boolean;

  // actions
  loadAll: () => Promise<void>;
  setSelectedAssetId: (id: string | null) => void;
  setHoveredAssetId: (id: string | null) => void;
  setSelectedCompetitorId: (id: string | null) => void;
  setHoveredCompetitorId: (id: string | null) => void;
  toggleBusinessType: (t: BusinessType) => void;
  setBusinessTypes: (types: BusinessType[]) => void;
  toggleBatch: (b: ReceivedBatch) => void;
  togglePriceBucket: (label: string) => void;
  setRegionLayer: (mode: RegionLayerMode) => void;
  setCurrentUser: (u: CurrentUser) => void;
  setPricingModel: (m: PricingModel) => void;
  setCompRadiusKm: (km: number) => void;
  setShowCompetitors: (b: boolean) => void;
  /** 初始化 / 更新尽调单条 check */
  initDueDiligence: (assetId: string, checks: DueDiligenceCheck[]) => void;
  setCheckResult: (
    assetId: string,
    checkId: string,
    patch: Partial<DueDiligenceCheck>
  ) => void;
  resetDueDiligence: (assetId: string) => void;
  /** 推进 intake 状态（to_do → in_progress → completed/rejected） */
  setIntakeStatus: (intakeId: string, status: IntakeAsset['status']) => void;
  /** 把 intake 的进度合并到 dueDiligence（按 intake.id 作为 key） */
  syncIntakeToDueDiligence: (intakeId: string) => void;
  toggleManualRisk: (assetId: string, tag: HiddenRiskTag) => void;
  togglePoi: (k: 'metro' | 'districts' | 'heatmap') => void;
  toggleModelUsed: (m: PricingModel) => void;
  setCrawlerTaskStatus: (id: string, status: CrawlerTask['status']) => void;
  resetData: () => void;

  getAssetById: (id: string | null | undefined) => Asset | undefined;
  getVisibleAssets: () => Asset[];
  getVisibleCompetitors: () => Competitor[];
}

const DEFAULT_USER: CurrentUser = { name: '王明 · 总部', scope: 'global' };

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  competitors: [],
  valuationLogic: null,
  poi: null,
  crawlerTasks: [],
  loading: false,
  error: null,

  selectedAssetId: null,
  hoveredAssetId: null,

  selectedCompetitorId: null,
  hoveredCompetitorId: null,

  selectedBusinessTypes: [],
  selectedBatches: [],
  selectedPriceBuckets: [],
  regionLayer: 'none',
  currentUser: DEFAULT_USER,

  pricingModel: 'comparative',
  pricingModelsUsed: ['comparative', 'historical'],
  compRadiusKm: 3,
  showCompetitors: true,
  manualRisks: {},
  dueDiligence: {},
  intakeAssets: [],

  showMetro: true,
  showDistricts: false,
  showHeatmap: false,

  loadAll: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      // 总是要加载的元数据（valuation logic, poi, crawler tasks, intake）+ 手写 25 数据集
      const [valuationLogic, poi, crawlerTasks, intakeAssets, rawAssets, rawComps] = await Promise.all([
        fetchJSON<ValuationLogic>(valuationUrl),
        fetchJSON<PoiDataset>(poiUrl),
        fetchJSON<CrawlerTask[]>(crawlerTasksUrl),
        fetchJSON<IntakeAsset[]>(intakeAssetsUrl),
        fetchJSON<Asset[]>(assetsUrl),
        fetchJSON<Competitor[]>(competitorsUrl),
      ]);

      // 合并：手写 25 资产（更精细的 images/hidden_risks）+ 业务 demo 200 资产 → 共 225
      const staticAssets = rawAssets.map((a) => ({
        ...a,
        ai_features: a.ai_features ?? generateAiFeatures(a),
        historical_transactions:
          a.historical_transactions ?? injectHistoricalTransactions(a).historical_transactions,
      }));
      const assets: Asset[] = [...staticAssets, ...generateAssets(200).map(injectHistoricalTransactions)];

      // 竞品：手写 25 + 业务 demo 300 → 共 325
      const competitors: Competitor[] = [...rawComps, ...generateCompetitors(300)];

      set({ assets, valuationLogic, competitors, poi, crawlerTasks, intakeAssets, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setHoveredAssetId: (id) => set({ hoveredAssetId: id }),

  setSelectedCompetitorId: (id) =>
    set((s) => ({
      selectedCompetitorId: id,
      hoveredCompetitorId: id && s.hoveredCompetitorId !== id ? id : s.hoveredCompetitorId,
    })),
  setHoveredCompetitorId: (id) => set({ hoveredCompetitorId: id }),

  toggleBusinessType: (t) =>
    set((s) => ({
      selectedBusinessTypes: s.selectedBusinessTypes.includes(t)
        ? s.selectedBusinessTypes.filter((x) => x !== t)
        : [...s.selectedBusinessTypes, t],
    })),
  setBusinessTypes: (types) => set({ selectedBusinessTypes: types }),
  toggleBatch: (b) =>
    set((s) => ({
      selectedBatches: s.selectedBatches.includes(b)
        ? s.selectedBatches.filter((x) => x !== b)
        : [...s.selectedBatches, b],
    })),

  togglePriceBucket: (label) =>
    set((s) => ({
      selectedPriceBuckets: s.selectedPriceBuckets.includes(label)
        ? s.selectedPriceBuckets.filter((x) => x !== label)
        : [...s.selectedPriceBuckets, label],
    })),

  setRegionLayer: (mode) => set({ regionLayer: mode }),
  setCurrentUser: (u) => set({ currentUser: u }),

  setPricingModel: (m) =>
    set((s) => ({
      pricingModel: m,
      pricingModelsUsed: s.pricingModelsUsed.includes(m)
        ? s.pricingModelsUsed
        : [...s.pricingModelsUsed, m],
    })),
  setCompRadiusKm: (km) => set({ compRadiusKm: km }),
  setShowCompetitors: (b) => set({ showCompetitors: b }),
  toggleManualRisk: (assetId, tag) =>
    set((s) => {
      const cur = s.manualRisks[assetId] ?? [];
      const next = cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag];
      return { manualRisks: { ...s.manualRisks, [assetId]: next } };
    }),

  togglePoi: (k) =>
    set((s) => ({
      showMetro: k === 'metro' ? !s.showMetro : s.showMetro,
      showDistricts: k === 'districts' ? !s.showDistricts : s.showDistricts,
      showHeatmap: k === 'heatmap' ? !s.showHeatmap : s.showHeatmap,
    })),
  toggleModelUsed: (m) =>
    set((s) => ({
      pricingModelsUsed: s.pricingModelsUsed.includes(m)
        ? s.pricingModelsUsed.filter((x) => x !== m)
        : [...s.pricingModelsUsed, m],
    })),
  setCrawlerTaskStatus: (id, status) =>
    set((s) => ({
      crawlerTasks: s.crawlerTasks.map((t) => (t.id === id ? { ...t, status } : t)),
    })),

  resetData: () => set({ assets: [], competitors: [] }),

  initDueDiligence: (assetId, checks) =>
    set((s) => ({ dueDiligence: { ...s.dueDiligence, [assetId]: checks } })),
  setCheckResult: (assetId, checkId, patch) =>
    set((s) => {
      const cur = s.dueDiligence[assetId] ?? [];
      const next = cur.map((c) => (c.id === checkId ? { ...c, ...patch } : c));
      return { dueDiligence: { ...s.dueDiligence, [assetId]: next } };
    }),
  resetDueDiligence: (assetId) =>
    set((s) => {
      const next = { ...s.dueDiligence };
      delete next[assetId];
      return { dueDiligence: next };
    }),

  setIntakeStatus: (intakeId, status) =>
    set((s) => ({
      intakeAssets: s.intakeAssets.map((i) =>
        i.id === intakeId
          ? { ...i, status, progress: i.progress ? { ...i.progress, status: status as 'pending' | 'in_progress' | 'completed' | 'rejected' } : undefined }
          : i
      ),
    })),
  syncIntakeToDueDiligence: (intakeId) =>
    set((s) => {
      const intake = s.intakeAssets.find((i) => i.id === intakeId);
      if (!intake?.progress) return {};
      return {
        dueDiligence: {
          ...s.dueDiligence,
          [intakeId]: intake.progress.checks,
        },
      };
    }),

  getAssetById: (id) => (id ? get().assets.find((a) => a.id === id) : undefined),

  getVisibleAssets: () => {
    const { assets, selectedBusinessTypes, selectedBatches, selectedPriceBuckets, currentUser } = get();
    return assets.filter((a) => {
      if (selectedBusinessTypes.length > 0 && !selectedBusinessTypes.includes(a.type as BusinessType))
        return false;
      if (selectedBatches.length > 0 && !selectedBatches.includes(a.received_batch))
        return false;
      if (selectedPriceBuckets.length > 0 && !selectedPriceBuckets.includes(getPriceBucket(a.estimated_price).label))
        return false;
      if (currentUser.scope === 'region' && currentUser.region && a.region !== currentUser.region)
        return false;
      return true;
    });
  },

  getVisibleCompetitors: () => {
    const { competitors, selectedBusinessTypes, currentUser } = get();
    return competitors.filter((c) => {
      if (selectedBusinessTypes.length > 0 && !selectedBusinessTypes.includes(c.type as BusinessType))
        return false;
      if (currentUser.scope === 'region' && currentUser.region && c.region !== currentUser.region)
        return false;
      return true;
    });
  },
}));
