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
const db = new Low(adapter, { counter: 0, history: [], deletedHistory: [] });

/**
 * Reads the latest data from the database file.
 * Ensures db.data is always current before use.
 * @returns {Promise<void>}
 */
async function initDb() {
  await db.read();
  if (!Array.isArray(db.data.deletedHistory)) {
    db.data.deletedHistory = [];
    await db.write();
  }
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
/**
 * DELETE /api/history/:id
 * Deletes a single history record by id and moves it to deletedHistory.
 * @param {string} id - History record id (URL param)
 * @returns {void}
 */
app.delete('/api/history/:id', async (req, res) => {
  await initDb();
  const { id } = req.params;
  const idx = db.data.history.findIndex((item) => item.id === id);
  if (idx !== -1) {
    const [deleted] = db.data.history.splice(idx, 1);
    db.data.deletedHistory.push(deleted);
    await db.write();
  }
  res.status(204).send();
});

/**
 * DELETE /api/history
 * Clears all history records.
 * @returns {void}
 */
/**
 * DELETE /api/history
 * Clears all history records and moves them to deletedHistory.
 * @returns {void}
 */
app.delete('/api/history', async (req, res) => {
  await initDb();
  db.data.deletedHistory.push(...db.data.history);
  db.data.history = [];
  await db.write();
  res.status(204).send();
});

/**
 * Starts the Express server.
 * Logs the port on successful startup.
 */
/**
 * POST /api/history/restore
 * Restores the most recently deleted history entry (LIFO stack).
 * @returns {object} Restored entry or 404 if none
 */
app.post('/api/history/restore', async (req, res) => {
  await initDb();
  if (db.data.deletedHistory.length === 0) {
    return res.status(404).json({ error: 'No deleted entries to restore.' });
  }
  const restored = db.data.deletedHistory.pop();
  db.data.history.push(restored);
  await db.write();
  res.status(200).json(restored);
});

/**
 * GET /api/history/deleted
 * Returns all deleted history entries (for debugging or UI display).
 * @returns {Array<{id: string, value: number, savedAt: string}>}
 */
app.get('/api/history/deleted', async (req, res) => {
  await initDb();
  res.json(db.data.deletedHistory);
});

/**
 * Starts the Express server.
 * Logs the port on successful startup.
 */
/**
 * POST /api/database/reset
 * Irreversibly clears the entire database: counter, history, deletedHistory.
 * @returns { success: true }
 */
app.post('/api/database/reset', async (req, res) => {
  await initDb();
  db.data.counter = 0;
  db.data.history = [];
  db.data.deletedHistory = [];
  await db.write();
  res.json({ success: true });
});

/**
 * Starts the Express server.
 * Logs the port on successful startup.
 */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
