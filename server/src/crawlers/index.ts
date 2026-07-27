/**
 * 爬虫分发器
 * 根据 crawl_task 的 source + task_type 调用对应爬虫模块
 */
import type Database from 'better-sqlite3';
import { crawlPoiForAsset, crawlPoiForAllAssets } from './amapPoi.js';
import { crawlLianjia } from './lianjia.js';

export interface CrawlTaskConfig {
  asset_id?: string;       // 指定资产 ID（单资产模式）
  radius?: number;         // 搜索半径（米）
  limit?: number;          // 批量模式处理资产数
  delay_ms?: number;       // 请求间隔
  region?: string;         // 区域过滤
}

export interface CrawlExecutionResult {
  success: boolean;
  recordsFetched: number;
  recordsSaved: number;
  recordsSkipped: number;
  errors: string[];
  detail: string;
}

/**
 * 执行爬虫任务
 */
export async function executeCrawlTask(
  db: Database.Database,
  source: string,
  taskType: string,
  config: CrawlTaskConfig,
): Promise<CrawlExecutionResult> {
  const apiKey = process.env.AMAP_API_KEY || '';

  // 高德 POI 爬虫
  if (source === 'amap' && taskType === 'poi') {
    if (!apiKey) {
      return {
        success: false,
        recordsFetched: 0,
        recordsSaved: 0,
        recordsSkipped: 0,
        errors: ['AMAP_API_KEY 未配置，请在 server/.env 中设置'],
        detail: '高德 POI 爬虫需要 AMAP_API_KEY 环境变量',
      };
    }

    const radius = config.radius ?? 1000;
    const delayMs = config.delay_ms ?? 350;

    try {
      // 单资产模式
      if (config.asset_id) {
        const asset = db.prepare('SELECT id, lng, lat FROM assets WHERE id = ?').get(config.asset_id) as
          | { id: string; lng: number; lat: number } | undefined;
        if (!asset) {
          return { success: false, recordsFetched: 0, recordsSaved: 0, recordsSkipped: 0, errors: [`资产 ${config.asset_id} 不存在`], detail: '资产未找到' };
        }
        const r = await crawlPoiForAsset(db, apiKey, asset.id, asset.lng, asset.lat, radius, delayMs);
        return {
          success: r.errors.length === 0,
          recordsFetched: r.totalFetched,
          recordsSaved: r.totalSaved,
          recordsSkipped: r.totalSkipped,
          errors: r.errors,
          detail: `资产 ${config.asset_id} 周边半径 ${radius}m，拉取 ${r.totalFetched} 条 POI，入库 ${r.totalSaved} 条。分类: ${JSON.stringify(r.byCategory)}`,
        };
      }

      // 批量模式
      const r = await crawlPoiForAllAssets(db, apiKey, {
        limit: config.limit ?? 50,
        radius,
        delayMs,
        region: config.region,
      });
      return {
        success: r.errors.length === 0,
        recordsFetched: r.totalFetched,
        recordsSaved: r.totalSaved,
        recordsSkipped: 0,
        errors: r.errors,
        detail: `批量处理 ${r.processed} 个资产，拉取 ${r.totalFetched} 条 POI，入库 ${r.totalSaved} 条`,
      };
    } catch (e) {
      return {
        success: false,
        recordsFetched: 0,
        recordsSaved: 0,
        recordsSkipped: 0,
        errors: [(e as Error).message],
        detail: `爬虫执行异常: ${(e as Error).message}`,
      };
    }
  }

  // 链家爬虫（source=lianjia, task_type=competitor）
  if (source === 'lianjia' && taskType === 'competitor') {
    try {
      const r = await crawlLianjia(db, {
        region: config.region,
        maxPages: config.limit ?? 3,
        onProgress: (msg) => console.log(`[lianjia progress] ${msg}`),
      });
      return {
        success: r.errors.length === 0,
        recordsFetched: r.totalFetched,
        recordsSaved: r.totalSaved,
        recordsSkipped: r.totalSkipped,
        errors: r.errors,
        detail: r.detail,
      };
    } catch (e) {
      return {
        success: false, recordsFetched: 0, recordsSaved: 0, recordsSkipped: 0,
        errors: [(e as Error).message], detail: `链家爬虫异常: ${(e as Error).message}`,
      };
    }
  }

  // 其他爬虫类型（占位）
  return {
    success: false,
    recordsFetched: 0,
    recordsSaved: 0,
    recordsSkipped: 0,
    errors: [`暂不支持 source=${source}, task_type=${taskType} 的爬虫`],
    detail: '该爬虫类型尚未实现',
  };
}
