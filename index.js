/**
 * Counter Project Backend
 * Node.js/Express API with persistent storage using lowdb.
 * Provides endpoints for counter operations and value history.
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

/**
 * Express app instance
 * @type {import('express').Express}
 */
const app = express();

/**
 * Port for server to listen on
 * @type {number}
 */
const PORT = 4000;

app.use(cors());
app.use(express.json());

/**
 * Path to the JSON database file
 * @type {string}
 */
const dbFile = path.join(__dirname, 'db.json');

/**
 * lowdb adapter and database instance
 * @type {import('lowdb').Low}
 */
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { counter: 0, history: [] });

/**
 * Reads the latest data from the database file.
 * Ensures db.data is always current before use.
 * @returns {Promise<void>}
 */
async function initDb() {
  await db.read();
}

/**
 * GET /api/counter
 * Returns the current counter value.
 * @returns { value: number }
 */
app.get('/api/counter', async (req, res) => {
  await initDb();
  res.json({ value: db.data.counter });
});

/**
 * POST /api/counter/increment
 * Increments the counter by a given amount (default: 1).
 * @param {number} [amount=1] - Amount to increment by (in body)
 * @returns { value: number }
 */
app.post('/api/counter/increment', async (req, res) => {
  await initDb();
  const amount = typeof req.body.amount === 'number' ? req.body.amount : 1;
  db.data.counter += amount;
  await db.write();
  res.json({ value: db.data.counter });
});

/**
 * POST /api/counter/decrement
 * Decrements the counter by a given amount (default: 1).
 * @param {number} [amount=1] - Amount to decrement by (in body)
 * @returns { value: number }
 */
app.post('/api/counter/decrement', async (req, res) => {
  await initDb();
  const amount = typeof req.body.amount === 'number' ? req.body.amount : 1;
  db.data.counter -= amount;
  await db.write();
  res.json({ value: db.data.counter });
});

/**
 * POST /api/counter/reset
 * Resets the counter to zero.
 * @returns { value: number }
 */
app.post('/api/counter/reset', async (req, res) => {
  await initDb();
  db.data.counter = 0;
  await db.write();
  res.json({ value: db.data.counter });
});

/**
 * POST /api/history
 * Saves the current counter value and timestamp to history.
 * @returns { id: string, value: number, savedAt: string }
 */
app.post('/api/history', async (req, res) => {
  await initDb();
  const record = {
    id: uuidv4(),
    value: db.data.counter,
    savedAt: new Date().toISOString(),
  };
  db.data.history.push(record);
  await db.write();
  res.status(201).json(record);
});

/**
 * GET /api/history
 * Returns all saved history records.
 * @returns {Array<{id: string, value: number, savedAt: string}>}
 */
app.get('/api/history', async (req, res) => {
  await initDb();
  res.json(db.data.history);
});

/**
 * DELETE /api/history/:id
 * Deletes a single history record by id.
 * @param {string} id - History record id (URL param)
 * @returns {void}
 */
app.delete('/api/history/:id', async (req, res) => {
  await initDb();
  const { id } = req.params;
  db.data.history = db.data.history.filter((item) => item.id !== id);
  await db.write();
  res.status(204).send();
});

/**
 * DELETE /api/history
 * Clears all history records.
 * @returns {void}
 */
app.delete('/api/history', async (req, res) => {
  await initDb();
  db.data.history = [];
  await db.write();
  res.status(204).send();
});

/**
 * Starts the Express server.
 * Logs the port on successful startup.
 */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
