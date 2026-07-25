import { create } from 'zustand';
import type {
  Asset,
  BusinessType,
  Competitor,
  CrawlerTask,
  CurrentUser,
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
import { generateAiFeatures } from '@/utils/aiFeaturesMock';
import { generateAssets, generateCompetitors } from '@/utils/extendedMockGenerator';
import { injectHistoricalTransactions } from '@/utils/historicalTransactionMock';

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
  regionLayer: RegionLayerMode;
  currentUser: CurrentUser;

  // M2: 详情页专用
  pricingModel: PricingModel;
  /** 报告中引用的方法（至少 1 种，最多 2 种） */
  pricingModelsUsed: PricingModel[];
  compRadiusKm: number;
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
  setRegionLayer: (mode: RegionLayerMode) => void;
  setCurrentUser: (u: CurrentUser) => void;
  setPricingModel: (m: PricingModel) => void;
  setCompRadiusKm: (km: number) => void;
  setShowCompetitors: (b: boolean) => void;
  toggleManualRisk: (assetId: string, tag: HiddenRiskTag) => void;
  togglePoi: (k: 'metro' | 'districts' | 'heatmap') => void;
  toggleModelUsed: (m: PricingModel) => void;
  setCrawlerTaskStatus: (id: string, status: CrawlerTask['status']) => void;
  toggleDemoScale: () => void;
  resetData: () => void;

  /** M4: 演示规模 */
  demoScale: 'small' | 'real';
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
  regionLayer: 'none',
  currentUser: DEFAULT_USER,

  pricingModel: 'comparative',
  pricingModelsUsed: ['comparative', 'historical'],
  compRadiusKm: 3,
  showCompetitors: true,
  manualRisks: {},

  showMetro: true,
  showDistricts: false,
  showHeatmap: false,

  demoScale: 'small',

  loadAll: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      // 总是要加载的元数据（valuation logic, poi, crawler tasks）
      const [valuationLogic, poi, crawlerTasks] = await Promise.all([
        fetchJSON<ValuationLogic>(valuationUrl),
        fetchJSON<PoiDataset>(poiUrl),
        fetchJSON<CrawlerTask[]>(crawlerTasksUrl),
      ]);

      const scale = get().demoScale;
      let assets: Asset[];
      let competitors: Competitor[];

      if (scale === 'real') {
        // 业务团队 demo：基于真实北京/上海坐标池生成 200 资产 + 300 竞品
        assets = generateAssets(200).map(injectHistoricalTransactions);
        competitors = generateCompetitors(300);
      } else {
        // 默认小数据集：25 资产 + 25 竞品
        const [rawAssets, rawComps] = await Promise.all([
          fetchJSON<Asset[]>(assetsUrl),
          fetchJSON<Competitor[]>(competitorsUrl),
        ]);
        assets = rawAssets.map((a) => ({
          ...a,
          ai_features: a.ai_features ?? generateAiFeatures(a),
          historical_transactions: a.historical_transactions ?? injectHistoricalTransactions(a).historical_transactions,
        }));
        competitors = rawComps;
      }

      set({ assets, valuationLogic, competitors, poi, crawlerTasks, loading: false });
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

  toggleDemoScale: () =>
    set((s) => {
      const next = s.demoScale === 'small' ? 'real' : 'small';
      return { demoScale: next, assets: [], competitors: [] };
    }),
  resetData: () => set({ assets: [], competitors: [] }),

  getAssetById: (id) => (id ? get().assets.find((a) => a.id === id) : undefined),

  getVisibleAssets: () => {
    const { assets, selectedBusinessTypes, selectedBatches, currentUser } = get();
    return assets.filter((a) => {
      if (selectedBusinessTypes.length > 0 && !selectedBusinessTypes.includes(a.type as BusinessType))
        return false;
      if (selectedBatches.length > 0 && !selectedBatches.includes(a.received_batch))
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
