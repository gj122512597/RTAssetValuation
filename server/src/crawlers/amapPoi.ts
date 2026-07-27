/**
 * 高德 POI 周边搜索爬虫
 *
 * 调用高德 Web 服务 API「周边搜索」接口，按资产坐标拉取周边 POI 数据。
 * API 文档：https://lbs.amap.com/api/webservice/guide/api/search#around
 *
 * 限流：个人开发者 QPS ≤ 3，企业 QPS ≤ 200，本模块默认间隔 350ms。
 */
import type Database from 'better-sqlite3';

const AMAP_BASE = 'https://restapi.amap.com/v3/place/around';

/** 高德 POI 类型编码 → 前端 category 映射 */
const POI_TYPE_MAP: Array<{ category: string; subType: string; typecode: string }> = [
  { category: 'metro',     subType: '地铁站',   typecode: '150500' },
  { category: 'bus',       subType: '公交站',   typecode: '150700' },
  { category: 'school',    subType: '学校',     typecode: '141200' },
  { category: 'hospital',  subType: '医院',     typecode: '090100' },
  { category: 'shopping',  subType: '购物中心', typecode: '060100' },
  { category: 'park',      subType: '公园',     typecode: '110100' },
];

export interface AmapPoiItem {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;      // "lng,lat"
  tel: string | string[];
  pname: string;         // 省
  cityname: string;      // 市
  adname: string;        // 区
}

interface AmapAroundResponse {
  status: string;        // "1" 成功
  count: string;
  pois: AmapPoiItem[];
  infocode?: string;
  info?: string;
}

/** sleep 毫秒 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 单次周边搜索请求（一页）
 * @returns POI 列表 + 总数
 */
async function searchAroundOnce(
  apiKey: string,
  lng: number,
  lat: number,
  typecode: string,
  radius: number,
  page: number,
): Promise<{ pois: AmapPoiItem[]; count: number }> {
  const url = `${AMAP_BASE}?key=${apiKey}&location=${lng},${lat}&types=${typecode}&radius=${radius}&offset=25&page=${page}&output=json&extensions=all`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`高德 API HTTP ${res.status}: ${res.statusText}`);
  const data = (await res.json()) as AmapAroundResponse;
  if (data.status !== '1') {
    throw new Error(`高德 API 返回错误: ${data.info || '未知'} (infocode: ${data.infocode || 'N/A'})`);
  }
  return { pois: data.pois || [], count: Number(data.count) || 0 };
}

/**
 * 按一个类型编码拉取周边所有页 POI
 */
async function crawlByType(
  apiKey: string,
  lng: number,
  lat: number,
  typecode: string,
  radius: number,
  maxPages: number,
  delayMs: number,
): Promise<AmapPoiItem[]> {
  const all: AmapPoiItem[] = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { pois, count } = await searchAroundOnce(apiKey, lng, lat, typecode, radius, page);
    all.push(...pois);
    if (pois.length < 25 || page >= maxPages || all.length >= count) break;
    page++;
    await sleep(delayMs);
  }
  return all;
}

/** Haversine 距离（米） */
function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export interface CrawlPoiResult {
  totalFetched: number;
  totalSaved: number;
  totalSkipped: number;
  byCategory: Record<string, number>;
  errors: string[];
}

/**
 * 按资产拉取周边 POI（6 类全量）
 *
 * @param db        数据库连接
 * @param apiKey    高德 Web 服务 API key
 * @param assetId   资产 ID
 * @param lng       资产经度
 * @param lat       资产纬度
 * @param radius    搜索半径（米，默认 1000，最大 3000）
 * @param delayMs   请求间隔（毫秒，默认 350）
 */
export async function crawlPoiForAsset(
  db: Database.Database,
  apiKey: string,
  assetId: string,
  lng: number,
  lat: number,
  radius = 1000,
  delayMs = 350,
): Promise<CrawlPoiResult> {
  const now = new Date().toISOString();
  const result: CrawlPoiResult = {
    totalFetched: 0,
    totalSaved: 0,
    totalSkipped: 0,
    byCategory: {},
    errors: [],
  };

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO poi_data
      (id, source, source_id, name, category, sub_type, region, address,
       lng, lat, asset_id, distance_to_asset_m, raw_json, captured_at)
    VALUES (?, 'amap', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const { category, subType, typecode } of POI_TYPE_MAP) {
    try {
      const pois = await crawlByType(apiKey, lng, lat, typecode, radius, 3, delayMs);
      result.byCategory[category] = pois.length;
      result.totalFetched += pois.length;

      for (const poi of pois) {
        const [poiLng, poiLat] = poi.location.split(',').map(Number);
        const distance = haversineMeters(lng, lat, poiLng, poiLat);
        const r = stmt.run(
          `poi-amap-${poi.id}`,
          poi.id,
          poi.name,
          category,
          subType,
          poi.adname || '',
          poi.address || '',
          poiLng,
          poiLat,
          assetId,
          distance,
          JSON.stringify(poi),
          now,
        );
        if (r.changes > 0) result.totalSaved++;
        else result.totalSkipped++;
      }
    } catch (e) {
      const msg = `[${category}] ${(e as Error).message}`;
      result.errors.push(msg);
    }
    await sleep(delayMs);
  }

  return result;
}

/**
 * 批量：从数据库读取资产，逐个拉取周边 POI
 *
 * @param db         数据库连接
 * @param apiKey     高德 API key
 * @param options    可选：limit（处理资产数）、radius、delayMs、region 过滤
 */
export async function crawlPoiForAllAssets(
  db: Database.Database,
  apiKey: string,
  options?: { limit?: number; radius?: number; delayMs?: number; region?: string },
): Promise<{ processed: number; totalFetched: number; totalSaved: number; errors: string[] }> {
  const { limit = 50, radius = 1000, delayMs = 350, region } = options || {};
  let sql = 'SELECT id, lng, lat FROM assets WHERE lng IS NOT NULL AND lat IS NOT NULL';
  const params: unknown[] = [];
  if (region) { sql += ' AND region = ?'; params.push(region); }
  sql += ' LIMIT ?';
  params.push(limit);

  const assets = db.prepare(sql).all(...params) as Array<{ id: string; lng: number; lat: number }>;
  console.log(`[amapPoi] 开始拉取 ${assets.length} 个资产的周边 POI（半径 ${radius}m）`);

  let totalFetched = 0;
  let totalSaved = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    console.log(`[amapPoi] (${i + 1}/${assets.length}) 资产 ${a.id} (${a.lng},${a.lat})`);
    const r = await crawlPoiForAsset(db, apiKey, a.id, a.lng, a.lat, radius, delayMs);
    totalFetched += r.totalFetched;
    totalSaved += r.totalSaved;
    if (r.errors.length > 0) allErrors.push(`资产 ${a.id}: ${r.errors.join('; ')}`);
    console.log(`  → 拉取 ${r.totalFetched} 条，入库 ${r.totalSaved} 条，分类: ${JSON.stringify(r.byCategory)}`);
  }

  return { processed: assets.length, totalFetched, totalSaved, errors: allErrors };
}
