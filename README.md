# Server API Documentation

This is the backend for the Counter Project, built with Node.js, Express, and lowdb for persistent storage.

## Endpoints

### Counter
- `GET /api/counter` — Get the current counter value.
- `POST /api/counter/increment` — Increment the counter by a given amount (default: 1). `{ amount?: number }`
- `POST /api/counter/decrement` — Decrement the counter by a given amount (default: 1). `{ amount?: number }`
- `POST /api/counter/reset` — Reset the counter to zero.

### History
- `POST /api/history` — Save the current counter value and timestamp to history.
- `GET /api/history` — Get all saved history records.
- `DELETE /api/history/:id` — Delete a single history record by id.
- `DELETE /api/history` — Clear all history records.

## Running Tests

```sh
npm install
npm test
```

## Notes
- All endpoints return JSON.
- Data is persisted in `db.json` using lowdb.
# Windsurf_Example1
