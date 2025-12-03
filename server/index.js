import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loadCollection, saveCollection, getDbPath } from './storage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: getDbPath() });
});

app.get('/api/niches', (_req, res) => {
  const data = loadCollection('niches', []);
  res.json(data);
});

app.put('/api/niches', (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Expected { items: [] }' });
  }
  const count = saveCollection('niches', items);
  res.json({ ok: true, count });
});

app.get('/api/projects', (_req, res) => {
  const data = loadCollection('projects', []);
  res.json(data);
});

app.put('/api/projects', (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Expected { items: [] }' });
  }
  const count = saveCollection('projects', items);
  res.json({ ok: true, count });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on port ${PORT}`);
});
