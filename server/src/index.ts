import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { initSchema, closeDb } from './db.js';
import crawlTasksRouter from './routes/crawlTasks.js';
import competitorsRouter from './routes/competitors.js';
import transactionsRouter from './routes/transactions.js';
import poiRouter from './routes/poi.js';
import governmentRouter from './routes/government.js';
import assetsRouter from './routes/assets.js';
import dataSourcesRouter from './routes/dataSources.js';
import statsRouter from './routes/stats.js';
import modelsRouter from './routes/models.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rt-asset-valuation-server', time: new Date().toISOString() });
});

// API 路由
app.use('/api/crawl-tasks', crawlTasksRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/poi', poiRouter);
app.use('/api/government', governmentRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/data-sources', dataSourcesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/models', modelsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] 未捕获错误:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 启动
initSchema();
app.listen(PORT, () => {
  console.log(`[server] 数据后端已启动: http://localhost:${PORT}`);
  console.log(`[server] API 文档:`);
  console.log(`  GET  /health`);
  console.log(`  CRUD /api/crawl-tasks`);
  console.log(`  CRUD /api/competitors`);
  console.log(`  CRUD /api/transactions`);
  console.log(`  CRUD /api/poi`);
  console.log(`  CRUD /api/government`);
  console.log(`  CRUD /api/assets`);
  console.log(`  CRUD /api/data-sources`);
  console.log(`  GET  /api/stats`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('[server] 正在关闭...');
  closeDb();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
