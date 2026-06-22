/**
 * init_db.js — 数据库初始化脚本
 * 自动建表 + 预置种子数据（仅当数据库不存在时执行）
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'campusrepair.db');

function initDatabase() {
  // 如果数据库已存在，不覆盖
  if (fs.existsSync(DB_PATH)) {
    console.log('[DB] 数据库已存在，跳过初始化');
    return;
  }

  console.log('[DB] 创建数据库并初始化表结构...');
  const db = new Database(DB_PATH);

  // 开启 WAL 模式提升性能
  db.pragma('journal_mode = WAL');

  // --- 建表 ---
  db.exec(`
    CREATE TABLE account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','admin','worker')),
      name TEXT,
      contact TEXT
    );

    CREATE TABLE ticket (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      worker_id INTEGER,
      category TEXT,
      location TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT '待审核'
        CHECK(status IN ('待审核','已分配','处理中','已完成','已评价')),
      rating INTEGER,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES account(id),
      FOREIGN KEY (worker_id) REFERENCES account(id)
    );

    CREATE TABLE timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      op_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES ticket(id)
    );
  `);

  // --- 预置账号 ---
  const insertAccount = db.prepare(
    'INSERT INTO account (username, password, role, name, contact) VALUES (?, ?, ?, ?, ?)'
  );

  insertAccount.run('student', '123', 'student', '陈同学', '138****1115');
  insertAccount.run('admin',   '123', 'admin',   '后勤管理员', null);
  insertAccount.run('worker',  '123', 'worker',  '王师傅', '139****0001');
  insertAccount.run('worker2', '123', 'worker',  '李师傅', '139****0002');
  insertAccount.run('worker3', '123', 'worker',  '张师傅', '139****0003');

  // 取出 ID 备用
  const studentId = 1;  // student
  const workerId  = 3;  // 王师傅
  const worker2Id = 4;  // 李师傅
  const adminId   = 2;  // admin（仅用于 admin 操作，不作为工单关联）

  // --- 预置工单 ---
  const insertTicket = db.prepare(
    'INSERT INTO ticket (reporter_id, worker_id, category, location, description, status, rating, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertTimeline = db.prepare(
    'INSERT INTO timeline (ticket_id, action, op_time) VALUES (?, ?, ?)'
  );

  // 工单1：待审核（student 报修，未分配维修工）
  insertTicket.run(studentId, null, '水电', '3号宿舍楼 502', '水龙头漏水', '待审核', null, '2026-06-20 08:00:00');
  insertTimeline.run(1, '提交报修', '2026-06-20 08:00:00');

  // 工单2：已分配（student 报修，王师傅已接单）
  insertTicket.run(studentId, workerId, '空调', '教学楼 A201', '空调不制冷', '已分配', null, '2026-06-20 09:00:00');
  insertTimeline.run(2, '提交报修', '2026-06-20 09:00:00');
  insertTimeline.run(2, '管理员受理，分派 王师傅', '2026-06-20 09:30:00');

  // 工单3：处理中（student 报修，李师傅处理中）
  insertTicket.run(studentId, worker2Id, '网络', '图书馆 3楼', 'WiFi信号弱', '处理中', null, '2026-06-20 10:00:00');
  insertTimeline.run(3, '提交报修', '2026-06-20 10:00:00');
  insertTimeline.run(3, '管理员受理，分派 李师傅', '2026-06-20 10:30:00');
  insertTimeline.run(3, '开始处理', '2026-06-20 11:00:00');

  // 工单4：已完成
  insertTicket.run(studentId, workerId, '家具', '2号宿舍楼 301', '椅子损坏', '已完成', null, '2026-06-19 14:00:00');
  insertTimeline.run(4, '提交报修', '2026-06-19 14:00:00');
  insertTimeline.run(4, '管理员受理，分派 王师傅', '2026-06-19 14:30:00');
  insertTimeline.run(4, '开始处理', '2026-06-19 15:00:00');
  insertTimeline.run(4, '维修完成', '2026-06-19 16:00:00');

  // 工单5：已评价
  insertTicket.run(studentId, workerId, '水电', '1号宿舍楼 203', '灯管坏了', '已评价', 5, '2026-06-18 10:00:00');
  insertTimeline.run(5, '提交报修', '2026-06-18 10:00:00');
  insertTimeline.run(5, '管理员受理，分派 王师傅', '2026-06-18 10:30:00');
  insertTimeline.run(5, '开始处理', '2026-06-18 11:00:00');
  insertTimeline.run(5, '维修完成', '2026-06-18 12:00:00');
  insertTimeline.run(5, '学生确认并评价 5星', '2026-06-18 14:00:00');

  db.close();
  console.log('[DB] 初始化完成！共创建 5 个账号、5 条工单及对应 timeline。');
}

// 导出以便 server.js 调用
module.exports = { initDatabase, DB_PATH };
