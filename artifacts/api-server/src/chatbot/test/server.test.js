import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createChatRouter, makeLimiter } from '../service.js';
import { getCatalog } from '@workspace/room-catalog';
import { chatTurn } from '../src/chat.js';
import { providerConfig } from '../src/config.js';

const messages = [{ role: 'user', content: 'Help me plan a meeting' }];
const config = () => ({ provider: 'gemini', apiKey: 'test-secret-never-return', model: 'test' });

async function harness(t, options = {}) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', createChatRouter({ limit: () => true, ...options }));
  app.use((err, _req, res, _next) => res.status(err.type === 'entity.too.large' ? 413 : 400).json({ code: 'INVALID_JSON' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    get: (path) => fetch(url + path),
    post: (body) => fetch(url + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }),
  };
}

test('API: room contract and missing key are safe and recoverable', async (t) => {
  const api = await harness(t, { getConfig: () => null });
  const catalog = await (await api.get('/api/rooms')).json();
  assert.deepEqual(catalog, getCatalog());
  const res = await api.post({ messages });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'NOT_CONFIGURED');
  for (const path of ['/api/.env', '/api/src/chat.js', '/api/data/forms.json']) assert.equal((await api.get(path)).status, 404);
});

test('API: rejects malformed, oversized and misordered histories', async (t) => {
  const api = await harness(t, { getConfig: config });
  for (const body of [
    {}, { messages: [] }, { messages: [{ role: 'system', content: 'secret' }] },
    { messages: [{ role: 'user', content: ' ' }] },
    { messages: [{ role: 'user', content: 'a'.repeat(2001) }] },
    { messages: [messages[0], messages[0]] },
    { messages: [messages[0], { role: 'assistant', content: 'last' }] },
    { messages: Array.from({ length: 31 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' })) },
  ]) assert.equal((await api.post(body)).status, 400);
  assert.equal((await api.post('{invalid')).status, 400);
  assert.equal((await api.post({ blob: 'x'.repeat(70_000) })).status, 413);
});

test('API: provider errors and invalid output never expose internals', async (t) => {
  for (const turn of [
    async () => { throw new Error('test-secret-never-return provider stack'); },
    async () => ({ reply: null }),
  ]) {
    const api = await harness(t, { getConfig: config, turn });
    const res = await api.post({ messages });
    assert.equal(res.status, 502);
    const body = await res.text();
    assert.ok(!body.includes('test-secret') && !body.includes('stack'));
    assert.match(body, /PROVIDER_FAILED/);
  }
});

test('API: total timeout aborts provider fetch and can be retried', async (t) => {
  let signal;
  const api = await harness(t, {
    getConfig: config, timeoutMs: 20,
    fetchImpl: async (_url, init) => { signal = init.signal; return new Promise(() => {}); },
    turn: async (_messages, cfg) => cfg.fetchImpl('https://example.invalid', {}),
  });
  const res = await api.post({ messages });
  assert.equal(res.status, 504);
  assert.equal(signal.aborted, true);
  assert.equal((await res.json()).code, 'PROVIDER_TIMEOUT');
});

test('API: unavailable catalog fails explicitly and limiter returns retry instructions', async (t) => {
  const broken = await harness(t, { getConfig: config, getRooms: () => { throw new Error('private/path'); } });
  assert.equal((await broken.get('/api/rooms')).status, 503);
  assert.equal((await broken.post({ messages })).status, 503);
  const limited = await harness(t, { getConfig: config, limit: () => false });
  const res = await limited.post({ messages });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), '60');
});

test('API: multi-turn Gemini calls preserve history, signatures, plan blockers and links', async (t) => {
  let round = 0;
  const input = { club_name: 'Test Club', event_name: 'Club Workshop', attendance: 20, has_food: true, options: [{ date: '2026-10-28', window_start: '18:00', window_end: '22:00', duration_minutes: 120 }] };
  const fullHistory = [...messages, { role: 'assistant', content: 'How many?' }, { role: 'user', content: '20, projector please' }];
  const api = await harness(t, {
    getConfig: config,
    turn: (history, cfg) => chatTurn(history, { ...cfg, demoToday: '2026-10-01' }),
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      const parts = round++ === 0 ? [
        { functionCall: { name: 'plan_event', args: input }, thoughtSignature: 'keep-me' },
        { functionCall: { name: 'recommend_rooms', args: { attendance: 20, needs: ['projector'] } } },
      ] : [{ text: 'Here is your plan. Food is not permitted.' }];
      if (round === 1) assert.deepEqual(body.contents.map((m) => m.parts[0].text), fullHistory.map((m) => m.content));
      else assert.equal(body.contents.at(-2).parts[0].thoughtSignature, 'keep-me');
      return { ok: true, json: async () => ({ candidates: [{ content: { parts } }] }) };
    },
  });
  const response = await api.post({ messages: fullHistory });
  assert.equal(response.status, 200);
  const out = await response.json();
  assert.equal(out.event.event_name, 'Club Workshop');
  assert.equal(out.plan.classroom_blockers[0].rule, 'R16');
  assert.ok(out.plan.steps[0].url.startsWith('https://'));
  assert.ok(out.plan.required_statements.accessibility);
  assert.ok(out.rooms.recommended.some((r) => r.floor === 2));
});

test('configuration and limiter are bounded without using provider credentials', () => {
  assert.equal(providerConfig({}), null);
  assert.equal(providerConfig({ CHAT_PROVIDER: 'other', GEMINI_API_KEY: 'test' }), null);
  assert.equal(providerConfig({ GEMINI_API_KEY: 'test' }).provider, 'gemini');
  assert.equal(providerConfig({ CHAT_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'test' }).provider, 'anthropic');
  assert.equal(providerConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'test', ANTHROPIC_MODEL: 'custom-model' }).model, 'custom-model');
  assert.equal(providerConfig({ GEMINI_API_KEY: 'test', GEMINI_MODEL: 'custom-gemini' }).model, 'custom-gemini');
  let clock = 0;
  const limit = makeLimiter({ now: () => clock, perClient: 2, globalLimit: 3 });
  assert.ok(limit('a')); assert.ok(limit('a')); assert.equal(limit('a'), false);
  assert.ok(limit('b')); assert.equal(limit('c'), false);
  clock = 60_001; assert.ok(limit('a'));
});
