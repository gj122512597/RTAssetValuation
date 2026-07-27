import { Router } from 'express';
import { getDb } from '../db.js';
import { executeCrawlTask, type CrawlTaskConfig } from '../crawlers/index.js';
import { crawlLianjia } from '../crawlers/lianjia.js';

const router = Router();

/**
 * 爬虫任务管理
 * - GET    /api/crawl-tasks          列表（支持 ?source=&status=&task_type= 过滤）
 * - GET    /api/crawl-tasks/:id      详情（含最近一次日志）
 * - POST   /api/crawl-tasks          创建
 * - PUT    /api/crawl-tasks/:id      更新
 * - DELETE /api/crawl-tasks/:id      删除
 * - POST   /api/crawl-tasks/:id/run  手动触发运行（占位，实际爬虫逻辑后续接入）
 * - GET    /api/crawl-tasks/:id/logs 任务运行日志列表
 */

// 列表
router.get('/', (req, res) => {
  const db = getDb();
  const { source, status, task_type } = req.query;
  let sql = 'SELECT * FROM crawl_tasks WHERE 1=1';
  const params: string[] = [];
  if (source) { sql += ' AND source = ?'; params.push(String(source)); }
  if (status) { sql += ' AND status = ?'; params.push(String(status)); }
  if (task_type) { sql += ' AND task_type = ?'; params.push(String(task_type)); }
  sql += ' ORDER BY updated_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// 详情（含最近一次日志）
router.get('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM v_crawl_task_latest WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json(task);
});

// 创建
router.post('/', (req, res) => {
  const db = getDb();
  const {
    id, name, source, task_type, region, schedule_cron, status, config_json,
  } = req.body;
  if (!id || !name || !source || !task_type) {
    return res.status(400).json({ error: '缺少必填字段: id, name, source, task_type' });
  }
  db.prepare(`
    INSERT INTO crawl_tasks (id, name, source, task_type, region, schedule_cron, status, config_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, source, task_type, region || null, schedule_cron || null,
    status || 'paused', config_json ? JSON.stringify(config_json) : null);
  res.status(201).json({ id, message: '任务已创建' });
});

// 更新
router.put('/:id', (req, res) => {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM crawl_tasks WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: '任务不存在' });

  const fields = ['name', 'source', 'task_type', 'region', 'schedule_cron', 'status', 'config_json', 'last_run_at', 'next_run_at', 'record_count', 'manual_calibrated'];
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'config_json' && typeof req.body[f] === 'object'
        ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ message: '无更新字段' });
  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE crawl_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ id: req.params.id, message: '任务已更新' });
});

// 删除
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM crawl_tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '任务不存在' });
  res.json({ message: '任务已删除' });
});

// 手动触发运行 —— 实际调用爬虫模块
router.post('/:id/run', async (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM crawl_tasks WHERE id = ?').get(req.params.id) as
    | { id: string; source: string; task_type: string; region: string | null; config_json: string | null } | undefined;
  if (!task) return res.status(404).json({ error: '任务不存在' });

  // 解析任务配置
  let config: CrawlTaskConfig = {};
  if (task.config_json) {
    try { config = JSON.parse(task.config_json) as CrawlTaskConfig; } catch { /* ignore */ }
  }
  // 请求体可覆盖配置（如指定 asset_id）
  if (req.body?.asset_id) config.asset_id = req.body.asset_id;
  if (req.body?.radius) config.radius = Number(req.body.radius);
  if (req.body?.limit) config.limit = Number(req.body.limit);
  if (task.region && !config.region) config.region = task.region;

  // 写入 running 日志
  const startedAt = new Date().toISOString();
  const logResult = db.prepare(`
    INSERT INTO crawl_logs (task_id, started_at, status)
    VALUES (?, ?, 'running')
  `).run(task.id, startedAt);
  const logId = logResult.lastInsertRowid as number;

  // 同步模式（默认）：等待爬虫完成后返回结果
  // 如需异步模式，传 ?async=1
  const isAsync = req.query.async === '1';

  if (isAsync) {
    // 异步执行，立即返回
    res.json({
      message: '任务已异步触发',
      task_id: task.id,
      log_id: logId,
      started_at: startedAt,
    });
    // 后台执行
    executeCrawlTask(db, task.source, task.task_type, config)
      .then((result) => {
        const finishedAt = new Date().toISOString();
        db.prepare(`
          UPDATE crawl_logs
          SET finished_at = ?, status = ?, records_fetched = ?,
              records_saved = ?, records_skipped = ?, error_message = ?, log_detail = ?
          WHERE id = ?
        `).run(
          finishedAt,
          result.success ? 'success' : 'failed',
          result.recordsFetched,
          result.recordsSaved,
          result.recordsSkipped,
          result.errors.length > 0 ? result.errors.join('; ') : null,
          result.detail,
          logId,
        );
        // 更新任务的 last_run_at 和 record_count
        db.prepare(`
          UPDATE crawl_tasks
          SET last_run_at = ?, record_count = record_count + ?, status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(finishedAt, result.recordsSaved, result.success ? 'running' : 'error', task.id);
        console.log(`[crawlTask ${task.id}] 异步完成: ${result.detail}`);
      })
      .catch((e: Error) => {
        db.prepare(`UPDATE crawl_logs SET finished_at = ?, status = 'failed', error_message = ? WHERE id = ?`)
          .run(new Date().toISOString(), e.message, logId);
        console.error(`[crawlTask ${task.id}] 异步异常:`, e.message);
      });
    return;
  }

  // 同步模式：等待完成
  try {
    const result = await executeCrawlTask(db, task.source, task.task_type, config);
    const finishedAt = new Date().toISOString();
    db.prepare(`
      UPDATE crawl_logs
      SET finished_at = ?, status = ?, records_fetched = ?,
          records_saved = ?, records_skipped = ?, error_message = ?, log_detail = ?
      WHERE id = ?
    `).run(
      finishedAt,
      result.success ? 'success' : 'failed',
      result.recordsFetched,
      result.recordsSaved,
      result.recordsSkipped,
      result.errors.length > 0 ? result.errors.join('; ') : null,
      result.detail,
      logId,
    );
    db.prepare(`
      UPDATE crawl_tasks
      SET last_run_at = ?, record_count = record_count + ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(finishedAt, result.recordsSaved, result.success ? 'running' : 'error', task.id);

    res.json({
      message: result.success ? '任务执行成功' : '任务执行完成（含错误）',
      task_id: task.id,
      log_id: logId,
      started_at: startedAt,
      finished_at: finishedAt,
      success: result.success,
      records_fetched: result.recordsFetched,
      records_saved: result.recordsSaved,
      records_skipped: result.recordsSkipped,
      detail: result.detail,
      errors: result.errors,
    });
  } catch (e) {
    const finishedAt = new Date().toISOString();
    db.prepare(`UPDATE crawl_logs SET finished_at = ?, status = 'failed', error_message = ? WHERE id = ?`)
      .run(finishedAt, (e as Error).message, logId);
    res.status(500).json({
      message: '任务执行失败',
      task_id: task.id,
      log_id: logId,
      error: (e as Error).message,
    });
  }
});

// 任务日志列表
router.get('/:id/logs', (req, res) => {
  const db = getDb();
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db.prepare(
    'SELECT * FROM crawl_logs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?'
  ).all(req.params.id, limit);
  res.json(rows);
});

// ===== 链家爬虫专用端点 =====

// 异步触发链家爬取（实时更新 log_detail 供前端轮询）
router.post('/lianjia/crawl', async (req, res) => {
  const db = getDb();
  const { region, max_pages } = req.body as { region?: string; max_pages?: number };
  const taskId = 'task-lianjia';
  const startedAt = new Date().toISOString();

  // 创建/更新链家任务
  db.prepare(`INSERT OR IGNORE INTO crawl_tasks (id, name, source, task_type, status) VALUES (?, '链家爬虫', 'lianjia', 'competitor', 'running')`).run(taskId);

  // 写入 running 日志
  const logResult = db.prepare(`INSERT INTO crawl_logs (task_id, started_at, status, log_detail) VALUES (?, ?, 'running', ?)`)
    .run(taskId, startedAt, `开始爬取链家${region ? ` · ${region}` : ''}...\n`);
  const logId = logResult.lastInsertRowid as number;

  // 立即返回，后台异步执行
  res.json({ message: '链家爬虫已启动', task_id: taskId, log_id: logId });

  // 后台执行
  (async () => {
    const progressLines: string[] = [`开始爬取链家${region ? ` · ${region}` : ''}...`];
    const flushDetail = () => {
      db.prepare('UPDATE crawl_logs SET log_detail = ? WHERE id = ?').run(progressLines.join('\n'), logId);
    };

    try {
      const result = await crawlLianjia(db, {
        region,
        maxPages: max_pages ?? 3,
        onProgress: (msg) => {
          progressLines.push(msg);
          flushDetail();
        },
      });

      progressLines.push(`\n=== 完成 ===`);
      progressLines.push(`总计: 拉取 ${result.totalFetched} 条，入库 ${result.totalSaved} 条，重复 ${result.totalSkipped} 条`);
      if (result.errors.length > 0) progressLines.push(`错误: ${result.errors.join('; ')}`);

      const finishedAt = new Date().toISOString();
      db.prepare(`UPDATE crawl_logs SET finished_at = ?, status = ?, records_fetched = ?, records_saved = ?, records_skipped = ?, error_message = ?, log_detail = ? WHERE id = ?`)
        .run(finishedAt, result.errors.length > 0 ? 'failed' : 'success',
          result.totalFetched, result.totalSaved, result.totalSkipped,
          result.errors.length > 0 ? result.errors.join('; ') : null,
          progressLines.join('\n'), logId);
      db.prepare(`UPDATE crawl_tasks SET last_run_at = ?, record_count = record_count + ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(finishedAt, result.totalSaved, 'running', taskId);
      console.log(`[lianjia] 完成: ${result.detail}`);
    } catch (e) {
      progressLines.push(`\n=== 异常 ===\n${(e as Error).message}`);
      flushDetail();
      db.prepare(`UPDATE crawl_logs SET finished_at = ?, status = 'failed', error_message = ?, log_detail = ? WHERE id = ?`)
        .run(new Date().toISOString(), (e as Error).message, progressLines.join('\n'), logId);
      db.prepare(`UPDATE crawl_tasks SET status = 'error', updated_at = datetime('now') WHERE id = ?`).run(taskId);
      console.error(`[lianjia] 异常:`, (e as Error).message);
    }
  })();
});

// 查询链家爬取进度（轮询端点）
router.get('/lianjia/status', (req, res) => {
  const db = getDb();
  const log = db.prepare(`
    SELECT l.*, t.name AS task_name, t.status AS task_status, t.last_run_at, t.record_count
    FROM crawl_logs l
    JOIN crawl_tasks t ON t.id = l.task_id
    WHERE t.source = 'lianjia'
    ORDER BY l.id DESC LIMIT 1
  `).get() as { id: number; task_id: string; started_at: string; finished_at: string | null; status: string; records_fetched: number; records_saved: number; log_detail: string | null; error_message: string | null; task_name: string; record_count: number } | undefined;

  if (!log) return res.json({ status: 'idle', message: '尚未执行过爬取' });
  res.json(log);
});

// 链家定时任务配置（创建/更新 cron）
router.put('/lianjia/schedule', (req, res) => {
  const db = getDb();
  const { cron, enabled } = req.body as { cron?: string; enabled?: boolean };
  const taskId = 'task-lianjia';
  db.prepare(`INSERT OR IGNORE INTO crawl_tasks (id, name, source, task_type, status) VALUES (?, '链家爬虫', 'lianjia', 'competitor', 'paused')`).run(taskId);
  const status = enabled ? 'running' : 'paused';
  db.prepare(`UPDATE crawl_tasks SET schedule_cron = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(cron || null, status, taskId);
  res.json({ message: '定时配置已更新', task_id: taskId, cron, enabled: status === 'running' });
});

export default router;
