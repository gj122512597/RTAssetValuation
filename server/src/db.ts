import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** SQLite 数据库文件路径（默认在 server/data/rt_asset.db） */
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/rt_asset.db');

/** 单例 Database 实例 */
let dbInstance: Database.Database | null = null;

/**
 * 获取 SQLite 数据库连接（单例）
 * - 启用 WAL 模式，提升并发读性能
 * - 启用外键约束
 */
export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  // 确保数据库目录存在
  const dbDir = dirname(DB_PATH);
  mkdirSync(dbDir, { recursive: true });

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  console.log(`[db] SQLite 已连接: ${DB_PATH}`);
  return dbInstance;
}

/**
 * 初始化数据库表结构
 * - 读取 schema.sql 并执行
 * - 幂等操作（所有 CREATE 均带 IF NOT EXISTS）
 */
export function initSchema(): void {
  const db = getDb();
  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  db.exec(sql);
  console.log('[db] 表结构初始化完成');
}

/**
 * 关闭数据库连接（用于优雅退出）
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[db] SQLite 连接已关闭');
  }
}

export { DB_PATH };
