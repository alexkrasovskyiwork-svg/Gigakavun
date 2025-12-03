import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.prepare(
  `CREATE TABLE IF NOT EXISTS collections (
    name TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '[]'
  )`
).run();

const ensureRow = db.prepare(
  `INSERT INTO collections(name, data)
   VALUES (@name, @data)
   ON CONFLICT(name) DO NOTHING`
);

const readRow = db.prepare(`SELECT data FROM collections WHERE name = ?`);
const writeRow = db.prepare(
  `INSERT INTO collections(name, data) VALUES (@name, @data)
   ON CONFLICT(name) DO UPDATE SET data = excluded.data`
);

export function loadCollection(name, fallback = []) {
  ensureRow.run({ name, data: JSON.stringify(fallback) });
  const row = readRow.get(name);
  if (!row) return fallback;
  try {
    return JSON.parse(row.data);
  } catch (error) {
    console.error(`Failed to parse collection ${name}:`, error);
    return fallback;
  }
}

export function saveCollection(name, items = []) {
  const payload = Array.isArray(items) ? items : [];
  writeRow.run({ name, data: JSON.stringify(payload) });
  return payload.length;
}

export function getDbPath() {
  return DB_PATH;
}
