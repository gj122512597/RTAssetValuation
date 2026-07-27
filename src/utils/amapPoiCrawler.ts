/**
 * 前端高德 POI 爬虫 —— 使用 AMap JS API 的 PlaceSearch 插件
 *
 * 优势：无需 Web 服务 API key，直接用现有 JS API key 即可
 * 拉取后通过后端 /api/poi/batch 接口写入 SQLite 数据库
 *
 * 高德 PlaceSearch 文档：
 *   https://lbs.amap.com/api/jsapi-v2/documentation#placeSearch
 */
import { loadAMap, getAmapKey, getAmapSecurity } from './amapEngine';
import { api } from '@/api/client';
import type { Asset } from '@/types';

/** POI 类型编码映射 */
const POI_TYPES: Array<{ category: string; subType: string; typecode: string }> = [
  { category: 'metro',    subType: '地铁站',   typecode: '150500' },
  { category: 'bus',      subType: '公交站',   typecode: '150700' },
  { category: 'school',   subType: '学校',     typecode: '141200' },
  { category: 'hospital', subType: '医院',     typecode: '090100' },
  { category: 'shopping', subType: '购物中心', typecode: '060100' },
  { category: 'park',     subType: '公园',     typecode: '110100' },
];

/** Haversine 距离（米） */
function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** 等待 ms */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 动态加载 AMap 插件（解决缓存实例缺少插件的问题）
 * AMap.plugin() 是官方推荐的动态加载方式，即使 AMap 已被加载过也能正常工作
 */
function ensurePlugin(AMapObj: typeof window.AMap, pluginName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查插件是否已存在（如 PlaceSearch → 检查 AMap.PlaceSearch）
    const className = pluginName.split('.').pop() as string;
    if ((AMapObj as unknown as Record<string, unknown>)[className]) {
      resolve();
      return;
    }
    // 动态加载
    AMapObj.plugin(pluginName, () => {
      if ((AMapObj as unknown as Record<string, unknown>)[className]) {
        resolve();
      } else {
        reject(new Error(`插件 ${pluginName} 加载失败`));
      }
    });
  });
}

/**
 * 用 AMap.PlaceSearch 搜索一类 POI 的周边
 */
async function searchNearByType(
  AMapObj: typeof window.AMap,
  lng: number,
  lat: number,
  typecode: string,
  radius: number,
): Promise<Array<{ id: string; name: string; address: string; lng: number; lat: number; adname: string; tel: string }>> {
  // 确保 PlaceSearch 插件已加载
  await ensurePlugin(AMapObj, 'AMap.PlaceSearch');

  return new Promise((resolve, reject) => {
    const PlaceSearchCtor = (AMapObj as unknown as { PlaceSearch: new (opts: Record<string, unknown>) => {
      searchNearBy: (keyword: string, center: [number, number], cb: (status: string, result: unknown) => void) => void;
    } }).PlaceSearch;

    const placeSearch = new PlaceSearchCtor({
      type: typecode,
      radius,
      pageSize: 25,
      pageIndex: 1,
      extensions: 'all',
    });

    placeSearch.searchNearBy('', [lng, lat], (status: string, result: unknown) => {
      if (status !== 'complete') {
        resolve([]);
        return;
      }
      const r = result as { poiList?: { pois?: Array<Record<string, unknown>> } };
      const pois = r.poiList?.pois || [];
      resolve(pois.map((p) => {
        const loc = p.location as { lng: number; lat: number } | undefined;
        return {
          id: String(p.id || ''),
          name: String(p.name || ''),
          address: String(p.address || ''),
          lng: loc?.lng ?? 0,
          lat: loc?.lat ?? 0,
          adname: String(p.adname || ''),
          tel: Array.isArray(p.tel) ? p.tel.join(',') : String(p.tel || ''),
        };
      }));
    });
  });
}

export interface PoiCrawlResult {
  assetId: string;
  fetched: number;
  saved: number;
  byCategory: Record<string, number>;
  errors: string[];
}

export interface PoiCrawlProgress {
  current: number;
  total: number;
  assetId: string;
  assetName: string;
  stage: string;
}

/**
 * 单资产 POI 拉取
 */
export async function crawlPoiForAsset(
  asset: Asset,
  radius = 1000,
  onProgress?: (stage: string) => void,
): Promise<PoiCrawlResult> {
  const key = getAmapKey();
  const security = getAmapSecurity();
  if (!key) throw new Error('高德地图 Key 未配置');

  const loaded = await loadAMap(key, security);
  if (!loaded) throw new Error('高德地图加载失败');
  const { AMap } = loaded;

  const [lng, lat] = asset.lnglat;
  const now = new Date().toISOString();
  const result: PoiCrawlResult = {
    assetId: asset.id,
    fetched: 0,
    saved: 0,
    byCategory: {},
    errors: [],
  };

  const allItems: Array<Record<string, unknown>> = [];

  for (const { category, subType, typecode } of POI_TYPES) {
    onProgress?.(`拉取 ${subType}...`);
    try {
      const pois = await searchNearByType(AMap, lng, lat, typecode, radius);
      result.byCategory[category] = pois.length;
      result.fetched += pois.length;

      for (const poi of pois) {
        const distance = haversineMeters(lng, lat, poi.lng, poi.lat);
        allItems.push({
          id: `poi-amap-${poi.id}`,
          source: 'amap',
          source_id: poi.id,
          name: poi.name,
          category,
          sub_type: subType,
          region: poi.adname || asset.region,
          address: poi.address,
          lng: poi.lng,
          lat: poi.lat,
          asset_id: asset.id,
          distance_to_asset_m: distance,
          raw_json: { name: poi.name, address: poi.address, tel: poi.tel, typecode },
          captured_at: now,
        });
      }
    } catch (e) {
      result.errors.push(`[${category}] ${(e as Error).message}`);
    }
    await sleep(300);
  }

  // 批量入库
  if (allItems.length > 0) {
    onProgress?.(`写入数据库...`);
    try {
      const res = await api.poi.batchCreate(allItems);
      result.saved = res.saved;
    } catch (e) {
      result.errors.push(`入库失败: ${(e as Error).message}`);
    }
  }

  return result;
}

/**
 * 批量资产 POI 拉取
 */
export async function crawlPoiForAssets(
  assets: Asset[],
  radius = 1000,
  onProgress?: (p: PoiCrawlProgress) => void,
): Promise<{ processed: number; totalFetched: number; totalSaved: number; errors: string[] }> {
  let totalFetched = 0;
  let totalSaved = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    onProgress?.({
      current: i + 1,
      total: assets.length,
      assetId: asset.id,
      assetName: asset.name,
      stage: '开始',
    });

    const r = await crawlPoiForAsset(asset, radius, (stage) => {
      onProgress?.({ current: i + 1, total: assets.length, assetId: asset.id, assetName: asset.name, stage });
    });

    totalFetched += r.fetched;
    totalSaved += r.saved;
    if (r.errors.length > 0) allErrors.push(`${asset.id}: ${r.errors.join('; ')}`);

    onProgress?.({
      current: i + 1,
      total: assets.length,
      assetId: asset.id,
      assetName: asset.name,
      stage: `完成（拉取 ${r.fetched}，入库 ${r.saved}）`,
    });
  }

  return { processed: assets.length, totalFetched, totalSaved, errors: allErrors };
}
