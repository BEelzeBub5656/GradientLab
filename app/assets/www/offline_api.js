(function (root) {
  'use strict';

  const DB_KEY = 'campusrepair_offline_db_v1';
  const STATUS_LABELS = {
    pending: '待审核',
    assigned: '已分配',
    processing: '处理中',
    done: '已完成',
    evaluated: '已评价',
  };
  const STATUS_KEYS = Object.fromEntries(
    Object.entries(STATUS_LABELS).map(([key, label]) => [label, key]),
  );

  function seedDatabase() {
    const accounts = [
      { id: 1, username: 'student', password: '123', role: 'student', name: '陈同学', contact: '138****1115' },
      { id: 2, username: 'admin', password: '123', role: 'admin', name: '后勤管理员', contact: '' },
      { id: 3, username: 'worker', password: '123', role: 'worker', name: '王师傅', contact: '139****0001' },
      { id: 4, username: 'worker2', password: '123', role: 'worker', name: '李师傅', contact: '139****0002' },
      { id: 5, username: 'worker3', password: '123', role: 'worker', name: '张师傅', contact: '139****0003' },
    ];
    const tickets = [
      { id: 1, reporter_id: 1, worker_id: null, category: '水电', location: '3号宿舍楼 502', description: '水龙头漏水', status: 'pending', rating: null, create_time: '2026-06-20T08:00:00+08:00' },
      { id: 2, reporter_id: 1, worker_id: 3, category: '空调', location: '教学楼 A201', description: '空调不制冷', status: 'assigned', rating: null, create_time: '2026-06-20T09:00:00+08:00' },
      { id: 3, reporter_id: 1, worker_id: 4, category: '网络', location: '图书馆 3楼', description: 'WiFi 信号弱', status: 'processing', rating: null, create_time: '2026-06-20T10:00:00+08:00' },
      { id: 4, reporter_id: 1, worker_id: 3, category: '家具', location: '2号宿舍楼 301', description: '椅子损坏', status: 'done', rating: null, create_time: '2026-06-19T14:00:00+08:00' },
      { id: 5, reporter_id: 1, worker_id: 3, category: '水电', location: '1号宿舍楼 203', description: '灯管坏了', status: 'evaluated', rating: 5, create_time: '2026-06-18T10:00:00+08:00' },
    ];
    const timelines = [
      { id: 1, ticket_id: 1, action: '提交报修', op_time: '2026-06-20T08:00:00+08:00' },
      { id: 2, ticket_id: 2, action: '提交报修', op_time: '2026-06-20T09:00:00+08:00' },
      { id: 3, ticket_id: 2, action: '管理员受理，分派 王师傅', op_time: '2026-06-20T09:30:00+08:00' },
      { id: 4, ticket_id: 3, action: '提交报修', op_time: '2026-06-20T10:00:00+08:00' },
      { id: 5, ticket_id: 3, action: '管理员受理，分派 李师傅', op_time: '2026-06-20T10:30:00+08:00' },
      { id: 6, ticket_id: 3, action: '开始处理', op_time: '2026-06-20T11:00:00+08:00' },
      { id: 7, ticket_id: 4, action: '提交报修', op_time: '2026-06-19T14:00:00+08:00' },
      { id: 8, ticket_id: 4, action: '管理员受理，分派 王师傅', op_time: '2026-06-19T14:30:00+08:00' },
      { id: 9, ticket_id: 4, action: '开始处理', op_time: '2026-06-19T15:00:00+08:00' },
      { id: 10, ticket_id: 4, action: '维修完成', op_time: '2026-06-19T16:00:00+08:00' },
      { id: 11, ticket_id: 5, action: '提交报修', op_time: '2026-06-18T10:00:00+08:00' },
      { id: 12, ticket_id: 5, action: '管理员受理，分派 王师傅', op_time: '2026-06-18T10:30:00+08:00' },
      { id: 13, ticket_id: 5, action: '开始处理', op_time: '2026-06-18T11:00:00+08:00' },
      { id: 14, ticket_id: 5, action: '维修完成', op_time: '2026-06-18T12:00:00+08:00' },
      { id: 15, ticket_id: 5, action: '学生确认并评价 5星', op_time: '2026-06-18T14:00:00+08:00' },
    ];
    return {
      version: 1,
      accounts,
      tickets,
      timelines,
      nextTicketId: 6,
      nextTimelineId: 16,
    };
  }

  function createCampusRepairApi(storage, nowProvider) {
    const now = nowProvider || (() => new Date());

    function loadDatabase() {
      const saved = storage.getItem(DB_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.version === 1) {
            return parsed;
          }
        } catch (_) {
          // Invalid local data is replaced with the known-good demo seed.
        }
      }
      const seeded = seedDatabase();
      storage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }

    let database = loadDatabase();

    function persist() {
      storage.setItem(DB_KEY, JSON.stringify(database));
    }

    function response(body, status) {
      return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    function headerValue(headers, name) {
      if (!headers) return '';
      if (typeof headers.get === 'function') return headers.get(name) || '';
      const key = Object.keys(headers).find(
        (item) => item.toLowerCase() === name.toLowerCase(),
      );
      return key ? headers[key] : '';
    }

    function parseBody(options) {
      if (!options || !options.body) return {};
      if (typeof options.body === 'string') {
        try {
          return JSON.parse(options.body);
        } catch (_) {
          return {};
        }
      }
      return options.body;
    }

    function tokenFor(account) {
      return `offline:${account.id}:${account.role}`;
    }

    function currentUser(options) {
      const authorization = headerValue(options && options.headers, 'Authorization');
      const match = /^Bearer offline:(\d+):([a-z]+)$/.exec(authorization);
      if (!match) return null;
      return database.accounts.find(
        (account) => account.id === Number(match[1]) && account.role === match[2],
      ) || null;
    }

    function accountById(id) {
      return database.accounts.find((account) => account.id === Number(id));
    }

    function publicTicket(ticket) {
      const reporter = accountById(ticket.reporter_id);
      const worker = accountById(ticket.worker_id);
      return {
        ...ticket,
        reporter_name: reporter ? reporter.name : null,
        worker_name: worker ? worker.name : null,
        contact: reporter ? reporter.contact : null,
      };
    }

    function addTimeline(ticketId, action) {
      database.timelines.push({
        id: database.nextTimelineId++,
        ticket_id: Number(ticketId),
        action,
        op_time: now().toISOString(),
      });
    }

    function requireUser(options) {
      const user = currentUser(options);
      return user || response({ error: '未提供或无效的认证令牌' }, 401);
    }

    function requireRole(user, role) {
      return user.role === role ? null : response({ error: '权限不足' }, 403);
    }

    return async function offlineFetch(input, options) {
      const method = ((options && options.method) || 'GET').toUpperCase();
      const rawUrl = typeof input === 'string' ? input : input.url;
      const url = new URL(rawUrl, 'https://campusrepair.local/');
      const path = url.pathname.replace(/^\/+/, '').replace(/^api\/?/, '');
      const segments = path.split('/').filter(Boolean);
      const body = parseBody(options);

      if (method === 'POST' && path === 'login') {
        const account = database.accounts.find(
          (item) => item.username === body.username && item.password === body.password,
        );
        if (!account) return response({ error: '用户名或密码错误' }, 401);
        return response({
          token: tokenFor(account),
          role: account.role,
          name: account.name,
          id: account.id,
        });
      }

      const userOrResponse = requireUser(options);
      if (userOrResponse instanceof Response) return userOrResponse;
      const user = userOrResponse;

      if (method === 'GET' && path === 'tickets') {
        let tickets = database.tickets;
        if (user.role === 'student') {
          tickets = tickets.filter((ticket) => ticket.reporter_id === user.id);
        } else if (user.role === 'worker') {
          tickets = tickets.filter((ticket) => ticket.worker_id === user.id);
        }
        return response(
          [...tickets]
            .sort((a, b) => new Date(b.create_time) - new Date(a.create_time))
            .map(publicTicket),
        );
      }

      if (method === 'POST' && path === 'tickets') {
        const denied = requireRole(user, 'student');
        if (denied) return denied;
        if (!body.category || !body.location || !body.description) {
          return response({ error: '请完整填写报修类别、地点和问题描述' }, 400);
        }
        const ticket = {
          id: database.nextTicketId++,
          reporter_id: user.id,
          worker_id: null,
          category: body.category,
          location: body.location,
          description: body.description,
          status: 'pending',
          rating: null,
          create_time: now().toISOString(),
        };
        database.tickets.push(ticket);
        addTimeline(ticket.id, '提交报修');
        persist();
        return response(publicTicket(ticket), 201);
      }

      if (method === 'GET' && path === 'workers') {
        const denied = requireRole(user, 'admin');
        if (denied) return denied;
        return response(
          database.accounts
            .filter((account) => account.role === 'worker')
            .map(({ id, name, contact }) => ({ id, name, contact })),
        );
      }

      if (method === 'GET' && path === 'stats') {
        const denied = requireRole(user, 'admin');
        if (denied) return denied;
        const stats = Object.fromEntries(
          Object.values(STATUS_LABELS).map((label) => [label, 0]),
        );
        for (const ticket of database.tickets) {
          stats[STATUS_LABELS[ticket.status]] += 1;
        }
        return response(stats);
      }

      if (segments[0] === 'tickets' && segments[1]) {
        const ticket = database.tickets.find(
          (item) => item.id === Number(segments[1]),
        );
        if (!ticket) return response({ error: '工单不存在' }, 404);

        if (method === 'GET' && segments.length === 2) {
          if (user.role === 'student' && ticket.reporter_id !== user.id) {
            return response({ error: '无权查看此工单' }, 403);
          }
          if (user.role === 'worker' && ticket.worker_id !== user.id) {
            return response({ error: '无权查看此工单' }, 403);
          }
          return response({
            ...publicTicket(ticket),
            timeline: database.timelines
              .filter((item) => item.ticket_id === ticket.id)
              .sort((a, b) => new Date(a.op_time) - new Date(b.op_time)),
          });
        }

        if (method === 'PUT' && segments[2] === 'assign') {
          const denied = requireRole(user, 'admin');
          if (denied) return denied;
          const worker = accountById(body.worker_id);
          if (!worker || worker.role !== 'worker') {
            return response({ error: '请选择有效的维修师傅' }, 400);
          }
          ticket.worker_id = worker.id;
          ticket.status = 'assigned';
          addTimeline(ticket.id, `管理员受理，分派 ${worker.name}`);
          persist();
          return response(publicTicket(ticket));
        }

        if (method === 'PUT' && segments[2] === 'status') {
          const denied = requireRole(user, 'worker');
          if (denied) return denied;
          if (ticket.worker_id !== user.id) {
            return response({ error: '这不是分配给你的工单' }, 403);
          }
          const status = STATUS_KEYS[body.status] || body.status;
          if (!['processing', 'done'].includes(status)) {
            return response({ error: '状态只能改为处理中或已完成' }, 400);
          }
          ticket.status = status;
          addTimeline(ticket.id, status === 'processing' ? '开始处理' : '维修完成');
          persist();
          return response(publicTicket(ticket));
        }

        if (method === 'PUT' && segments[2] === 'rate') {
          const denied = requireRole(user, 'student');
          if (denied) return denied;
          const rating = Number(body.rating);
          if (ticket.reporter_id !== user.id) {
            return response({ error: '无权评价此工单' }, 403);
          }
          if (ticket.status !== 'done') {
            return response({ error: '只能评价已完成状态的工单' }, 400);
          }
          if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return response({ error: '评分必须是 1-5 的整数' }, 400);
          }
          ticket.status = 'evaluated';
          ticket.rating = rating;
          addTimeline(ticket.id, `学生确认并评价 ${rating}星`);
          persist();
          return response(publicTicket(ticket));
        }
      }

      return response({ error: `未实现的离线接口：${method} ${path}` }, 404);
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCampusRepairApi, seedDatabase };
  }

  if (root && root.localStorage && root.fetch) {
    const browserFetch = root.fetch.bind(root);
    const offlineFetch = createCampusRepairApi(root.localStorage);
    root.fetch = function (input, options) {
      const rawUrl = typeof input === 'string' ? input : input.url;
      if (/^(?:\.\/)?api\//.test(rawUrl) || /\/api\//.test(rawUrl)) {
        return offlineFetch(input, options);
      }
      return browserFetch(input, options);
    };
    root.CampusRepairOffline = true;
  }
})(typeof window !== 'undefined' ? window : globalThis);
