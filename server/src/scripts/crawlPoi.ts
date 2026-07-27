/**
 * 高德 POI 批量拉取脚本
 *
 * 用法：
 *   npm run crawl:poi                          # 拉取前 10 个资产的周边 POI
 *   npm run crawl:poi -- --limit=50            # 拉取前 50 个资产
 *   npm run crawl:poi -- --asset=RZ-2023-003   # 只拉取指定资产
 *   npm run crawl:poi -- --region=朝阳区        # 只拉取指定区域的资产
 *   npm run crawl:poi -- --radius=2000          # 搜索半径 2000 米
 *
 * 环境变量：
 *   AMAP_API_KEY  高德 Web 服务 API key（必填）
 */
import { getDb, initSchema, closeDb } from '../db.js';
import { executeCrawlTask } from '../crawlers/index.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
function loadEnv(): void {
  const envPath = join(__dirname, '../../.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

function parseArgs(): { asset?: string; limit?: number; region?: string; radius?: number } {
  const args = process.argv.slice(2);
  const out: { asset?: string; limit?: number; region?: string; radius?: number } = {};
  for (const a of args) {
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'asset') out.asset = v;
    else if (k === 'limit') out.limit = Number(v);
    else if (k === 'region') out.region = v;
    else if (k === 'radius') out.radius = Number(v);
  }
  return out;
}

async function main(): Promise<void> {
  const apiKey = process.env.AMAP_API_KEY || '';
  if (!apiKey) {
    console.error('AMAP_API_KEY 未配置！');
    console.error('请在 server/.env 中设置：AMAP_API_KEY=你的高德Web服务API密钥');
    console.error('申请地址：https://lbs.amap.com/api/webservice/guide/create-project/get-key');
    process.exit(1);
  }

  const args = parseArgs();
  initSchema();
  const db = getDb();

  console.log('====================================');
  console.log('  高德 POI 周边搜索爬虫');
  console.log('====================================');
  console.log(`  API Key: ${apiKey.substring(0, 8)}...`);
  if (args.asset) console.log(`  模式: 单资产 ${args.asset}`);
  else console.log(`  模式: 批量（limit=${args.limit ?? 10}）`);
  if (args.region) console.log(`  区域过滤: ${args.region}`);
  console.log(`  搜索半径: ${args.radius ?? 1000}m`);
  console.log('====================================\n');

  const result = await executeCrawlTask(db, 'amap', 'poi', {
    asset_id: args.asset,
    limit: args.limit ?? 10,
    region: args.region,
    radius: args.radius ?? 1000,
    delay_ms: 350,
  });

  console.log('\n====================================');
  console.log('  拉取完成');
  console.log('====================================');
  console.log(`  拉取总数: ${result.recordsFetched}`);
  console.log(`  入库数量: ${result.recordsSaved}`);
  console.log(`  跳过数量: ${result.recordsSkipped}`);
  console.log(`  错误数量: ${result.errors.length}`);
  if (result.errors.length > 0) {
    console.log('\n  错误详情:');
    for (const e of result.errors) console.log(`    - ${e}`);
  }
  console.log(`\n  详情: ${result.detail}`);
  console.log('====================================');

  closeDb();
}

main().catch((e) => {
  console.error('脚本执行失败:', e);
  closeDb();
  process.exit(1);
});
