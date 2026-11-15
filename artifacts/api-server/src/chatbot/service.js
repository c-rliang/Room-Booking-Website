import { Router } from 'express';
import { getCatalog } from '@workspace/room-catalog';
import { SendChatBody, SendChatResponse, GetRoomsResponse } from '@workspace/api-zod';
import { providerConfig } from './src/config.js';
import { chatTurn } from './src/chat.js';

export const ERRORS = {
  INVALID_INPUT: [400, 'Send 1–30 alternating user and assistant messages, ending with a user message, each up to 2,000 characters.'],
  NOT_CONFIGURED: [503, 'Live chat is not configured. Add the selected provider key (GEMINI_API_KEY by default, or ANTHROPIC_API_KEY for Anthropic) in workspace Secrets, then restart the API Server. You can still explore rooms and view saved requests.'],
  CATALOG_UNAVAILABLE: [503, 'Room data is temporarily unavailable. Please retry shortly.'],
  RATE_LIMITED: [429, 'Too many chat requests. Please wait a minute and retry.'],
  PROVIDER_FAILED: [502, 'The assistant could not respond. Please retry; your conversation is still here.'],
  PROVIDER_TIMEOUT: [504, 'The assistant took too long to respond. Please retry.'],
};

export function fail(res, code) {
  const [status, error] = ERRORS[code];
  res.status(status).json({ code, error });
}

// Bounded in-memory limits: no persistence or user identity is introduced.
export function makeLimiter({ now = Date.now, perClient = 12, globalLimit = 60 } = {}) {
  const clients = new Map();
  let global = { count: 0, until: 0 };
  return (client) => {
    const time = now();
    for (const [key, bucket] of clients) if (bucket.until <= time) clients.delete(key);
    if (time >= global.until) global = { count: 0, until: time + 60_000 };
    if (global.count >= globalLimit || (!clients.has(client) && clients.size >= 1000)) return false;
    const bucket = clients.get(client) || { count: 0, until: time + 60_000 };
    clients.set(client, bucket);
    if (bucket.count >= perClient) return false;
    bucket.count++; global.count++;
    return true;
  };
}

export function validConversation(messages) {
  return messages.every((m, i) => m.content.trim() && m.role === (i % 2 === 0 ? 'user' : 'assistant')) &&
    messages.at(-1)?.role === 'user';
}

export function createChatRouter({
  getConfig = providerConfig, getRooms = getCatalog, turn = chatTurn,
  fetchImpl = globalThis.fetch, timeoutMs = 25_000, limit = makeLimiter(),
} = {}) {
  const router = Router();
  router.get('/rooms', (_req, res) => {
    try { res.json(GetRoomsResponse.parse(getRooms())); }
    catch { fail(res, 'CATALOG_UNAVAILABLE'); }
  });
  router.post('/chat', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const parsed = SendChatBody.safeParse(req.body);
    if (!parsed.success || !validConversation(parsed.data.messages)) return fail(res, 'INVALID_INPUT');
    // Reject cross-origin browser calls without trusting client forwarding headers.
    const origin = req.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== req.get('host')) return fail(res, 'INVALID_INPUT');
      } catch { return fail(res, 'INVALID_INPUT'); }
    }
    if (!limit(req.ip || 'unknown')) {
      res.setHeader('Retry-After', '60');
      return fail(res, 'RATE_LIMITED');
    }
    try { GetRoomsResponse.parse(getRooms()); }
    catch { return fail(res, 'CATALOG_UNAVAILABLE'); }
    const config = getConfig();
    if (!config) return fail(res, 'NOT_CONFIGURED');
    const controller = new AbortController();
    let timer;
    // One total deadline covers all tool rounds and response parsing, not one per round.
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('TIMEOUT')); }, timeoutMs);
    });
    try {
      const result = await Promise.race([
        turn(parsed.data.messages, {
          ...config,
          fetchImpl: (url, init) => fetchImpl(url, { ...init, signal: controller.signal }),
        }),
        timeout,
      ]);
    res.json(SendChatResponse.parse(result));
    } catch {
      const code = controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_FAILED';
      // Never log provider errors, body, conversation, headers or credentials.
      req.log?.warn({ code }, 'Chat turn failed');
      fail(res, code);
    } finally { clearTimeout(timer); }
  });
  return router;
}
