/**
 * @jest-environment node
 */
const request = require('supertest');
const express = require('express');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Setup a test app using the same logic as index.js but with a temp db
function createTestServer(dbFile) {
  const app = express();
  app.use(express.json());
  const adapter = new JSONFile(dbFile);
  const db = new Low(adapter, { counter: 0, history: [] });
  async function initDb() { await db.read(); }

  app.get('/api/counter', async (req, res) => { await initDb(); res.json({ value: db.data.counter }); });
  app.post('/api/counter/increment', async (req, res) => { await initDb(); const amount = typeof req.body.amount === 'number' ? req.body.amount : 1; db.data.counter += amount; await db.write(); res.json({ value: db.data.counter }); });
  app.post('/api/counter/decrement', async (req, res) => { await initDb(); const amount = typeof req.body.amount === 'number' ? req.body.amount : 1; db.data.counter -= amount; await db.write(); res.json({ value: db.data.counter }); });
  app.post('/api/counter/reset', async (req, res) => { await initDb(); db.data.counter = 0; await db.write(); res.json({ value: db.data.counter }); });
  app.post('/api/history', async (req, res) => { await initDb(); const record = { id: uuidv4(), value: db.data.counter, savedAt: new Date().toISOString() }; db.data.history.push(record); await db.write(); res.status(201).json(record); });
  app.get('/api/history', async (req, res) => { await initDb(); res.json(db.data.history); });
  app.delete('/api/history/:id', async (req, res) => { await initDb(); const { id } = req.params; db.data.history = db.data.history.filter((item) => item.id !== id); await db.write(); res.status(204).send(); });
  app.delete('/api/history', async (req, res) => { await initDb(); db.data.history = []; await db.write(); res.status(204).send(); });
  return app;
}

describe('Counter API', () => {
  const dbFile = path.join(__dirname, 'test-db.json');
  let app;
  beforeEach(() => { app = createTestServer(dbFile); });
  afterEach(() => { require('fs').writeFileSync(dbFile, JSON.stringify({ counter: 0, history: [] })); });

  test('GET /api/counter returns initial value', async () => {
    const res = await request(app).get('/api/counter');
    expect(res.status).toBe(200);
    expect(res.body.value).toBe(0);
  });
  test('POST /api/counter/increment increments counter', async () => {
    await request(app).post('/api/counter/increment').send({ amount: 5 });
    const res = await request(app).get('/api/counter');
    expect(res.body.value).toBe(5);
  });
  test('POST /api/counter/decrement decrements counter', async () => {
    await request(app).post('/api/counter/increment').send({ amount: 10 });
    await request(app).post('/api/counter/decrement').send({ amount: 3 });
    const res = await request(app).get('/api/counter');
    expect(res.body.value).toBe(7);
  });
  test('POST /api/counter/reset resets counter', async () => {
    await request(app).post('/api/counter/increment').send({ amount: 2 });
    await request(app).post('/api/counter/reset');
    const res = await request(app).get('/api/counter');
    expect(res.body.value).toBe(0);
  });
  test('POST /api/history saves current counter', async () => {
    await request(app).post('/api/counter/increment').send({ amount: 4 });
    const saveRes = await request(app).post('/api/history');
    expect(saveRes.status).toBe(201);
    expect(saveRes.body.value).toBe(4);
    const res = await request(app).get('/api/history');
    expect(res.body.length).toBe(1);
    expect(res.body[0].value).toBe(4);
  });
  test('DELETE /api/history/:id deletes a record', async () => {
    await request(app).post('/api/counter/increment').send({ amount: 2 });
    const saveRes = await request(app).post('/api/history');
    const id = saveRes.body.id;
    await request(app).delete(`/api/history/${id}`);
    const res = await request(app).get('/api/history');
    expect(res.body.length).toBe(0);
  });
  test('DELETE /api/history clears all history', async () => {
    await request(app).post('/api/counter/increment').send({ amount: 2 });
    await request(app).post('/api/history');
    await request(app).post('/api/counter/increment').send({ amount: 3 });
    await request(app).post('/api/history');
    await request(app).delete('/api/history');
    const res = await request(app).get('/api/history');
    expect(res.body.length).toBe(0);
  });
});
