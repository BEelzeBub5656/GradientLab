/**
 * server.js — CampusRepair 校园报修系统后端入口
 * Node.js + Express + better-sqlite3
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./init_db');
const Database = require('better-sqlite3');

// 初始化数据库（仅在库不存在时建表+seed）
initDatabase();

// 打开数据库连接（单例，全局共享）
const db = new Database(path.join(__dirname, 'campusrepair.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 挂载 API 路由
const apiRouter = require('./routes')(db);
app.use('/api', apiRouter);

// 健康检查
app.get('/', (req, res) => {
  res.json({ service: 'CampusRepair Server', status: 'running' });
});

// 启动
const HOST = '127.0.0.1';
const PORT = 3458;

const server = app.listen(PORT, HOST, () => {
  console.log(`[Server] CampusRepair 后端已启动 → http://${HOST}:${PORT}`);
});

module.exports = { app, server, db };
