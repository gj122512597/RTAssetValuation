/**
 * 数据库初始化脚本
 * 运行：pnpm --dir server db:init  或  cd server && npm run db:init
 */
import { initSchema, closeDb } from '../db.js';

initSchema();
console.log('[initDb] 数据库初始化完成');
closeDb();
