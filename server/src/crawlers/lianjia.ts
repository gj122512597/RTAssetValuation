/**
 * 链家爬虫 —— 写字楼/商铺租赁挂牌数据
 *
 * 爬取链家租房列表页，提取房源数据写入 competitor_listings 表
 *
 * 反爬策略：轮换 UA / 3-5s 随机间隔 / Referer / 最多 5 页 / 403检测
 * 解析策略：优先 __NEXT_DATA__ JSON → cheerio HTML → 回退正则
 */
import type Database from 'better-sqlite3';
import * as cheerio from 'cheerio';

const LIANJIA_BASE = 'https://bj.lianjia.com';
const LIST_PATH = '/zufang';

export const REGION_PINYIN: Record<string, string> = {
  '朝阳': 'chaoyangqu', '海淀': 'haidianqu', '东城': 'dongchengqu',
  '西城': 'xichengqu', '丰台': 'fengtaiqu', '通州': 'tongzhouqu',
  '昌平': 'changpingqu', '大兴': 'daxingqu', '顺义': 'shunyiqu', '房山': 'fangshanqu',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
function randomDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface LianjiaListing {
  source_id: string; name: string; region: string; address: string;
  list_price: number; area_sqm: number; layout: string; listing_url: string;
  raw: Record<string, unknown>;
}
export interface LianjiaCrawlResult {
  totalFetched: number; totalSaved: number; totalSkipped: number;
  errors: string[]; pages: number; detail: string;
}

async function fetchListPage(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': randomUA(), 'Referer': LIANJIA_BASE,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 403) throw new Error('403 —— 链家封禁当前 IP，请稍后再试');
      if (res.status === 412) throw new Error('412 —— 链家验证码拦截，请稍后再试');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 500) throw new Error('返回内容过短，可能被拦截');
      if (res.redirected) console.log(`[lianjia] 重定向到: ${res.url}`);
      return html;
    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`[lianjia] 第 ${attempt} 次失败: ${(e as Error).message}，重试中...`);
      await sleep((3 - attempt) * 3000);
    }
  }
  throw new Error('请求失败');
}

function parseFromNextData(html: string): LianjiaListing[] {
  const match = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    const findList = (obj: unknown): unknown[] | null => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
      const o = obj as Record<string, unknown>;
      for (const key of ['list', 'houses', 'data', 'items']) {
        if (Array.isArray(o[key])) return o[key] as unknown[];
      }
      for (const v of Object.values(o)) {
        const found = findList(v);
        if (found) return found;
      }
      return null;
    };
    const list = findList(data);
    if (!list) return [];
    return list.map((item): LianjiaListing | null => {
      const r = item as Record<string, unknown>;
      const title = String(r.title || r.name || r.community_name || '');
      if (!title) return null;
      const price = Number(r.price || r.list_price || 0);
      const area = Number(r.area || r.acreage || r.area_sqm || 0);
      return {
        source_id: String(r.house_id || r.id || r.list_id || `${Date.now()}-${Math.random()}`),
        name: title, region: String(r.region || r.district || '未知'),
        address: String(r.address || r.location || ''),
        list_price: price > 1000 ? Number((price / (area * 30)).toFixed(2)) : price,
        area_sqm: area, layout: String(r.layout || ''),
        listing_url: r.url ? String(r.url) : `${LIST_PATH}/${r.house_id || r.id}.html`,
        raw: r,
      };
    }).filter((x): x is LianjiaListing => x !== null);
  } catch { return []; }
}

function parseFromHtml(html: string): LianjiaListing[] {
  const $ = cheerio.load(html);
  const listings: LianjiaListing[] = [];
  $('.content__list--item, .list-item, .house-item').each((_, el) => {
    const $el = $(el);
    const name = $el.find('.content__list--item--title, .title, .house-title').text().trim();
    if (!name) return;
    const priceText = $el.find('.content__list--item-price, .price').text().trim();
    const areaText = $el.find('.content__list--item--des, .area').text().trim();
    const href = $el.find('a').first().attr('href') || '';
    const priceNum = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    const areaNum = parseFloat(areaText.match(/(\d+)\s*㎡/)?.[1] || '0') || 0;
    const dayPrice = priceNum > 0 && areaNum > 0 ? Number((priceNum / (areaNum * 30)).toFixed(2)) : priceNum;
    const sourceId = href.match(/(\w+)\.html/)?.[1] || `${Date.now()}-${Math.random()}`;
    listings.push({
      source_id: sourceId, name,
      region: areaText.split('/')[0]?.trim() || '未知', address: areaText,
      list_price: dayPrice, area_sqm: areaNum, layout: areaText,
      listing_url: href.startsWith('http') ? href : `${LIANJIA_BASE}${href}`,
      raw: { name, priceText, areaText, href },
    });
  });
  return listings;
}

function parseListPage(html: string): LianjiaListing[] {
  const fromNext = parseFromNextData(html);
  if (fromNext.length > 0) { console.log(`[lianjia] __NEXT_DATA__ 解析 ${fromNext.length} 条`); return fromNext; }
  const fromHtml = parseFromHtml(html);
  if (fromHtml.length > 0) { console.log(`[lianjia] HTML 解析 ${fromHtml.length} 条`); return fromHtml; }
  console.log('[lianjia] 两种策略均未提取到数据');
  return [];
}

function saveListings(db: Database.Database, listings: LianjiaListing[]): { saved: number; skipped: number } {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO competitor_listings
      (id, source, source_id, name, region, address, lng, lat, type,
       list_price, area_sqm, layout, listing_url, raw_json, captured_at)
    VALUES (?, 'lianjia', ?, ?, ?, ?, NULL, NULL, 'office', ?, ?, ?, ?, ?, ?)
  `);
  let saved = 0, skipped = 0;
  for (const item of listings) {
    const r = stmt.run(`lianjia-${item.source_id}`, item.source_id, item.name,
      item.region, item.address, item.list_price, item.area_sqm, item.layout,
      item.listing_url, JSON.stringify(item.raw), now);
    if (r.changes > 0) saved++; else skipped++;
  }
  return { saved, skipped };
}

export async function crawlLianjia(
  db: Database.Database,
  options: { region?: string; maxPages?: number; onProgress?: (msg: string) => void } = {},
): Promise<LianjiaCrawlResult> {
  const { region, maxPages = 3, onProgress } = options;
  const result: LianjiaCrawlResult = {
    totalFetched: 0, totalSaved: 0, totalSkipped: 0, errors: [], pages: 0, detail: '',
  };
  const regionPinyin = region ? REGION_PINYIN[region] : undefined;
  const basePath = regionPinyin ? `${LIST_PATH}/${regionPinyin}` : LIST_PATH;

  onProgress?.(`开始爬取链家${region ? ` · ${region}` : ''}，最多 ${maxPages} 页`);

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? `${LIANJIA_BASE}${basePath}/` : `${LIANJIA_BASE}${basePath}/pg${page}/`;
    onProgress?.(`正在爬取第 ${page}/${maxPages} 页...`);
    console.log(`[lianjia] 第 ${page} 页: ${url}`);

    try {
      const html = await fetchListPage(url);
      const listings = parseListPage(html);
      result.totalFetched += listings.length;
      result.pages = page;

      if (listings.length === 0) {
        // 诊断 HTML 内容，输出到日志供调试
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '无标题';
        const hasNextData = html.includes('__NEXT_DATA__');
        const hasCaptcha = html.includes('验证') || html.includes('captcha') || html.includes('verify') || html.includes('安全验证');
        const hasListClass = html.includes('content__list') || html.includes('list-item') || html.includes('house-item');
        const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim().substring(0, 300);

        onProgress?.(`第 ${page} 页未解析到数据，诊断如下:`);
        onProgress?.(`  页面标题: ${title}`);
        onProgress?.(`  HTML 长度: ${html.length} 字符`);
        onProgress?.(`  含 __NEXT_DATA__: ${hasNextData ? '是' : '否'}`);
        onProgress?.(`  含验证码/安全验证: ${hasCaptcha ? '是 ⚠️' : '否'}`);
        onProgress?.(`  含列表 CSS 类名: ${hasListClass ? '是' : '否'}`);
        onProgress?.(`  页面纯文本摘要: ${bodyText.replace(/\s+/g, ' ').substring(0, 200)}`);
        result.errors.push(`第 ${page} 页未解析到数据（标题: ${title}，验证码: ${hasCaptcha ? '是' : '否'}）`);
        break;
      }

      onProgress?.(`第 ${page} 页解析到 ${listings.length} 条，写入数据库...`);
      const { saved, skipped } = saveListings(db, listings);
      result.totalSaved += saved;
      result.totalSkipped += skipped;
      onProgress?.(`第 ${page} 页完成: 新增 ${saved} 条，重复 ${skipped} 条`);

      if (page < maxPages) {
        onProgress?.(`等待 3-5 秒后爬取下一页...`);
        await randomDelay();
      }
    } catch (e) {
      const msg = (e as Error).message;
      result.errors.push(`第 ${page} 页: ${msg}`);
      onProgress?.(`第 ${page} 页失败: ${msg}`);
      break;
    }
  }

  result.detail = `爬取 ${result.pages} 页，共 ${result.totalFetched} 条，入库 ${result.totalSaved} 条，重复 ${result.totalSkipped} 条`;
  onProgress?.(`爬取完成: ${result.detail}`);
  return result;
}
