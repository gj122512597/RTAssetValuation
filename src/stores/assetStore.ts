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
import { assetsApi } from '@/api/client';
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

/** 将数据库 assets 表行（含 JSON 字段字符串）映射为前端 Asset，并补齐 ai_features / historical_transactions */
function mapDbTrainingAsset(row: Record<string, any>): Asset {
  const parseJson = (v: unknown): any => {
    if (v == null) return undefined;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch {
        return undefined;
      }
    }
    return v;
  };

  const featuresRaw = parseJson(row.features_json) ?? row.features;
  const features: Asset['features'] = {
    subway_distance: Number(featuresRaw?.subway_distance ?? 500),
    condition_score: Number(featuresRaw?.condition_score ?? 7),
  };
  const hiddenRisks = (parseJson(row.hidden_risks) ?? []) as HiddenRiskTag[];

  const base: Asset = {
    id: String(row.id),
    name: String(row.name ?? '未命名资产'),
    address: row.address ? String(row.address) : '',
    lnglat: [Number(row.lng), Number(row.lat)],
    area: Number(row.area ?? 0),
    status: (row.status as Asset['status']) ?? 'leased',
    days_vacant: Number(row.days_vacant ?? 0),
    type: (row.type as BusinessType) ?? 'office',
    estimated_price: Number(row.estimated_price ?? 0),
    monthly_rent: Number(row.monthly_rent ?? 0),
    occupancy_rate: Number(row.occupancy_rate ?? 0),
    confidence: Number(row.confidence ?? 0.7),
    region: row.region ? String(row.region) : '',
    received_batch: (row.received_batch as ReceivedBatch) ?? 'batch-4',
    certificate_status: (row.certificate_status as Asset['certificate_status']) ?? 'complete',
    decoration_level: (row.decoration_level as Asset['decoration_level']) ?? 'standard',
    last_renovation: row.last_renovation != null ? Number(row.last_renovation) : undefined,
    default_free_rent_days:
      row.default_free_rent_days != null ? Number(row.default_free_rent_days) : undefined,
    features,
    hidden_risks: hiddenRisks,
  } as Asset;

  // ai_features / historical_transactions 缺失时，复用与现有 225 资产相同的生成器补齐
  return {
    ...base,
    ai_features: base.ai_features ?? generateAiFeatures(base),
    historical_transactions:
      base.historical_transactions ?? injectHistoricalTransactions(base).historical_transactions,
  };
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

      // 合并数据库中的训练样本资产（Hedonic 模型训练用，青岛真实坐标）
      // 这些资产存在 assets 表（received_batch=hedonic_training），前端不自带，需从后端拉取
      try {
        const dbRows = (await assetsApi.list({
          received_batch: 'hedonic_training',
        })) as Record<string, any>[];
        const existingIds = new Set(assets.map((a) => a.id));
        for (const row of dbRows) {
          if (existingIds.has(String(row.id))) continue;
          const merged = mapDbTrainingAsset(row);
          assets.push(merged);
          existingIds.add(merged.id);
        }
      } catch (dbErr) {
        // 后端未启动 / 表不存在时静默跳过，不阻塞主流程
        console.warn('[assetStore] 加载数据库训练资产失败，已跳过：', dbErr);
      }

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
