// Chatbot server (no dependencies). Run from the chatbot/ folder: `npm start`.
//   POST /api/chat   { messages: [{role, content}] } -> { reply, plan, rooms, room_ids }
//   GET  /api/rooms  -> rooms from data/rooms.json with popularity added
// It also serves the website: the repo root when chatbot/ sits inside the repo,
// so the skeleton's index.html, data/rooms.json and the widget share one origin.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CHATBOT_DIR, REPO_ROOT, IN_REPO, ROOMS_FILE, ROOMS_URL, ROOMS_REFRESH_SECONDS } from './src/config.js';
import { chatTurn } from './src/chat.js';
import { loadRooms, startRemoteSync, roomSourceInfo } from './src/rooms.js';

const PORT = Number(process.env.PORT) || 8787;
const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase() === 'anthropic' ? 'anthropic' : 'gemini';
const CONFIG = PROVIDER === 'gemini'
  ? { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash' }
  : { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5' };
CONFIG.demoToday = process.env.DEMO_TODAY || '';
const KEY_NAME = PROVIDER === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
const PLACEHOLDER_KEY = !CONFIG.apiKey || /paste-your|\.\.\.$/.test(CONFIG.apiKey);

// Only needed if the website is served by a different dev server (e.g. VS Code Live Server).
const CORS_ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

const STATIC_ROOT = IN_REPO ? REPO_ROOT : CHATBOT_DIR;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.geojson': 'application/json' };

/** Never serve secrets or server code: no dotfiles, and inside chatbot/ only the widget and demo page. */
function servable(abs) {
  const rel = path.relative(STATIC_ROOT, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false;
  if (rel.split(path.sep).some((seg) => seg.startsWith('.') || seg === 'node_modules')) return false;
  const inChatbot = path.relative(CHATBOT_DIR, abs);
  if (!inChatbot.startsWith('..') && !path.isAbsolute(inChatbot)) {
    return inChatbot === 'demo.html' || inChatbot.startsWith(`widget${path.sep}`);
  }
  return true;
}

const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
};

function send(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...extra });
  res.end(JSON.stringify(body));
}

async function readJson(req, maxBytes = 100_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.headers.origin && CORS_ORIGINS.includes(req.headers.origin)) {
    res.setHeader('access-control-allow-origin', req.headers.origin);
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('vary', 'origin');
  }
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      if (rateLimited(req.socket.remoteAddress)) return send(res, 429, { error: 'Too many requests. Wait a minute and try again.' });
      if (PLACEHOLDER_KEY) return send(res, 500, { error: `The server has no real ${KEY_NAME}. Put your key in chatbot/.env and restart.` });
      let body;
      try { body = await readJson(req); } catch { return send(res, 400, { error: 'Invalid JSON body' }); }
      try {
        const out = await chatTurn(body.messages, CONFIG);
        return send(res, 200, { ...out, room_ids: (out.rooms?.recommended || []).map((r) => r.id) });
      } catch (err) {
        const bad = /messages|message|role/.test(err.message) && !/API error|returned no content/.test(err.message);
        console.error('[chat]', err.message);
        return send(res, bad ? 400 : 502, { error: bad ? err.message : 'The assistant is unavailable right now. Please try again.' });
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/rooms') {
      const { rooms, warnings, updated_at } = loadRooms();
      return send(res, 200, { rooms, warnings, updated_at, ...roomSourceInfo() });
    }

    if (req.method === 'GET') {
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (rel === '' || rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(STATIC_ROOT, rel);
      if (url.pathname === '/' && !existsSync(file)) {
        res.writeHead(302, { location: IN_REPO ? '/chatbot/demo.html' : '/demo.html' });
        return res.end();
      }
      if (!servable(file)) return send(res, 404, { error: 'Not found' });
      try {
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
        return res.end(data);
      } catch {
        return send(res, 404, { error: 'Not found' });
      }
    }
    send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'Server error' });
  }
});

startRemoteSync();

server.listen(PORT, () => {
  const { rooms } = loadRooms();
  console.log(`RSO Room Helper running at http://localhost:${PORT}`);
  console.log(`Provider: ${PROVIDER} | Model: ${CONFIG.model} | Demo date: ${CONFIG.demoToday || 'real today'} | ${KEY_NAME}: ${PLACEHOLDER_KEY ? 'MISSING (still the placeholder?)' : 'set'}`);
  if (ROOMS_URL) console.log(`Rooms: syncing from GitHub every ${ROOMS_REFRESH_SECONDS}s (until the first sync: ${rooms.length} from ${path.relative(process.cwd(), ROOMS_FILE)})`);
  else console.log(`Rooms: ${rooms.length} from ${path.relative(process.cwd(), ROOMS_FILE) || ROOMS_FILE}${IN_REPO ? ' (team repo; run git pull to update)' : ''}`);
});
