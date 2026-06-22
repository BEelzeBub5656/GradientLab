const test = require('node:test');
const assert = require('node:assert/strict');

const { createCampusRepairApi } = require('../assets/www/offline_api.js');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

async function json(response) {
  return response.json();
}

async function login(fetchApi, username) {
  const response = await fetchApi('api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: '123' }),
  });
  assert.equal(response.status, 200);
  return json(response);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

test('rejects an invalid login', async () => {
  const fetchApi = createCampusRepairApi(createStorage());
  const response = await fetchApi('api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'student', password: 'wrong' }),
  });

  assert.equal(response.status, 401);
  assert.equal((await json(response)).error, '用户名或密码错误');
});

test('completes the offline repair workflow across all three roles', async () => {
  const fetchApi = createCampusRepairApi(
    createStorage(),
    () => new Date('2026-06-22T12:00:00Z'),
  );

  const student = await login(fetchApi, 'student');
  const createdResponse = await fetchApi('api/tickets', {
    method: 'POST',
    headers: auth(student.token),
    body: JSON.stringify({
      category: '水电',
      location: '4号宿舍楼 101',
      description: '洗手池下水管漏水',
    }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await json(createdResponse);
  assert.equal(created.status, 'pending');

  const admin = await login(fetchApi, 'admin');
  const assignedResponse = await fetchApi(
    `api/tickets/${created.id}/assign`,
    {
      method: 'PUT',
      headers: auth(admin.token),
      body: JSON.stringify({ worker_id: 3 }),
    },
  );
  assert.equal((await json(assignedResponse)).status, 'assigned');

  const worker = await login(fetchApi, 'worker');
  const processingResponse = await fetchApi(
    `api/tickets/${created.id}/status`,
    {
      method: 'PUT',
      headers: auth(worker.token),
      body: JSON.stringify({ status: '处理中' }),
    },
  );
  assert.equal((await json(processingResponse)).status, 'processing');

  const doneResponse = await fetchApi(`api/tickets/${created.id}/status`, {
    method: 'PUT',
    headers: auth(worker.token),
    body: JSON.stringify({ status: '已完成' }),
  });
  assert.equal((await json(doneResponse)).status, 'done');

  const ratedResponse = await fetchApi(`api/tickets/${created.id}/rate`, {
    method: 'PUT',
    headers: auth(student.token),
    body: JSON.stringify({ rating: 5 }),
  });
  const rated = await json(ratedResponse);
  assert.equal(rated.status, 'evaluated');
  assert.equal(rated.rating, 5);

  const detailResponse = await fetchApi(`api/tickets/${created.id}`, {
    headers: auth(student.token),
  });
  const detail = await json(detailResponse);
  assert.deepEqual(
    detail.timeline.map((item) => item.action),
    [
      '提交报修',
      '管理员受理，分派 王师傅',
      '开始处理',
      '维修完成',
      '学生确认并评价 5星',
    ],
  );
});

test('filters ticket lists by the authenticated role', async () => {
  const fetchApi = createCampusRepairApi(createStorage());
  const student = await login(fetchApi, 'student');
  const worker = await login(fetchApi, 'worker');
  const admin = await login(fetchApi, 'admin');

  const studentTickets = await json(
    await fetchApi('api/tickets', { headers: auth(student.token) }),
  );
  const workerTickets = await json(
    await fetchApi('api/tickets', { headers: auth(worker.token) }),
  );
  const adminTickets = await json(
    await fetchApi('api/tickets', { headers: auth(admin.token) }),
  );

  assert.ok(studentTickets.every((ticket) => ticket.reporter_id === 1));
  assert.ok(workerTickets.every((ticket) => ticket.worker_id === 3));
  assert.equal(adminTickets.length, 5);
});
