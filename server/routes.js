/**
 * routes.js — 全部业务路由
 */
const express = require('express');
const { signToken, authMiddleware, requireRole } = require('./auth');

module.exports = function (db) {
  const router = express.Router();

  // ===== 辅助：通过 id 获取用户姓名 =====
  function getUserName(id) {
    const row = db.prepare('SELECT name FROM account WHERE id = ?').get(id);
    return row ? row.name : null;
  }

  // ===== POST /api/login =====
  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    const user = db.prepare('SELECT * FROM account WHERE username = ? AND password = ?').get(username, password);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = signToken({ id: user.id, role: user.role, name: user.name });
    return res.json({ token, role: user.role, name: user.name, id: user.id });
  });

  // ===== 以下路由需要认证 =====
  router.use(authMiddleware);

  // ===== GET /api/tickets — 获取工单列表（按角色过滤）=====
  router.get('/tickets', (req, res) => {
    let whereClause = '';
    const params = [];

    if (req.user.role === 'student') {
      whereClause = 'WHERE t.reporter_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'worker') {
      whereClause = 'WHERE t.worker_id = ?';
      params.push(req.user.id);
    }
    // admin 不添加过滤条件

    const sql = `
      SELECT t.*,
             reporter.name AS reporter_name,
             worker.name AS worker_name
      FROM ticket t
      LEFT JOIN account reporter ON t.reporter_id = reporter.id
      LEFT JOIN account worker ON t.worker_id = worker.id
      ${whereClause}
      ORDER BY t.create_time DESC
    `;
    const rows = db.prepare(sql).all(...params);
    return res.json(rows);
  });

  // ===== POST /api/tickets — 新建工单（仅 student）=====
  router.post('/tickets', requireRole('student'), (req, res) => {
    const { category, location, description } = req.body;
    if (!category || !location || !description) {
      return res.status(400).json({ error: '缺少必填字段：category, location, description' });
    }

    const stmt = db.prepare(
      'INSERT INTO ticket (reporter_id, category, location, description, status) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(req.user.id, category, location, description, '待审核');
    const ticketId = result.lastInsertRowid;

    // 插入 timeline
    db.prepare('INSERT INTO timeline (ticket_id, action) VALUES (?, ?)').run(ticketId, '提交报修');

    const ticket = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    return res.status(201).json(ticket);
  });

  // ===== GET /api/tickets/:id — 工单详情 + timeline =====
  router.get('/tickets/:id', (req, res) => {
    const ticketId = req.params.id;

    const ticket = db.prepare(`
      SELECT t.*,
             reporter.name AS reporter_name,
             worker.name AS worker_name
      FROM ticket t
      LEFT JOIN account reporter ON t.reporter_id = reporter.id
      LEFT JOIN account worker ON t.worker_id = worker.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    // 权限校验：student 只能看自己的，worker 只能看分配给自己的
    if (req.user.role === 'student' && ticket.reporter_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看此工单' });
    }
    if (req.user.role === 'worker' && ticket.worker_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看此工单' });
    }

    const timeline = db.prepare('SELECT * FROM timeline WHERE ticket_id = ? ORDER BY op_time ASC').all(ticketId);
    ticket.timeline = timeline;

    return res.json(ticket);
  });

  // ===== PUT /api/tickets/:id/assign — 分配维修工（仅 admin）=====
  router.put('/tickets/:id/assign', requireRole('admin'), (req, res) => {
    const ticketId = req.params.id;
    const { worker_id } = req.body;

    if (!worker_id) {
      return res.status(400).json({ error: '请提供 worker_id' });
    }

    // 检查工单存在
    const ticket = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    // 检查维修工是否存在且角色正确
    const worker = db.prepare('SELECT * FROM account WHERE id = ? AND role = ?').get(worker_id, 'worker');
    if (!worker) {
      return res.status(400).json({ error: '无效的维修工 ID' });
    }

    db.prepare('UPDATE ticket SET status = ?, worker_id = ? WHERE id = ?').run('已分配', worker_id, ticketId);
    db.prepare('INSERT INTO timeline (ticket_id, action) VALUES (?, ?)').run(ticketId, `管理员受理，分派 ${worker.name}`);

    const updated = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    return res.json(updated);
  });

  // ===== PUT /api/tickets/:id/status — 更新工单状态（仅 worker）=====
  router.put('/tickets/:id/status', requireRole('worker'), (req, res) => {
    const ticketId = req.params.id;
    const { status } = req.body;

    if (!status || !['处理中', '已完成'].includes(status)) {
      return res.status(400).json({ error: '状态只能改为 处理中 或 已完成' });
    }

    const ticket = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }
    if (ticket.worker_id !== req.user.id) {
      return res.status(403).json({ error: '这不是分配给你的工单' });
    }

    const actionText = status === '处理中' ? '开始处理' : '维修完成';
    db.prepare('UPDATE ticket SET status = ? WHERE id = ?').run(status, ticketId);
    db.prepare('INSERT INTO timeline (ticket_id, action) VALUES (?, ?)').run(ticketId, actionText);

    const updated = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    return res.json(updated);
  });

  // ===== PUT /api/tickets/:id/rate — 评价工单（仅 student）=====
  router.put('/tickets/:id/rate', requireRole('student'), (req, res) => {
    const ticketId = req.params.id;
    const { rating } = req.body;

    if (rating === undefined || rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分 rating 必须是 1-5 的整数' });
    }

    const ticket = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }
    if (ticket.reporter_id !== req.user.id) {
      return res.status(403).json({ error: '无权评价此工单' });
    }
    if (ticket.status !== '已完成') {
      return res.status(400).json({ error: '只能评价已完成状态的工单' });
    }

    db.prepare('UPDATE ticket SET status = ?, rating = ? WHERE id = ?').run('已评价', rating, ticketId);
    db.prepare('INSERT INTO timeline (ticket_id, action) VALUES (?, ?)').run(ticketId, `学生确认并评价 ${rating}星`);

    const updated = db.prepare('SELECT * FROM ticket WHERE id = ?').get(ticketId);
    return res.json(updated);
  });

  // ===== GET /api/stats — 统计各状态工单数（仅 admin）=====
  router.get('/stats', requireRole('admin'), (req, res) => {
    const rows = db.prepare(
      'SELECT status, COUNT(*) AS count FROM ticket GROUP BY status'
    ).all();

    // 构建完整响应，确保每个状态都有
    const result = { '待审核': 0, '已分配': 0, '处理中': 0, '已完成': 0, '已评价': 0 };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return res.json(result);
  });

  // ===== GET /api/workers — 获取维修工列表（仅 admin）=====
  router.get('/workers', requireRole('admin'), (req, res) => {
    const workers = db.prepare('SELECT id, name, contact FROM account WHERE role = ?').all('worker');
    return res.json(workers);
  });

  return router;
};
