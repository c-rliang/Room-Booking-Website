// Starts the real server and checks the API and that secrets are never served.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('..', import.meta.url));
const PORT = 3900 + Math.floor(Math.random() * 90);

test('server: API works, secrets and code are not served', async (t) => {
  const proc = spawn(process.execPath, ['server.js'], { cwd: dir, env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: 'paste-your-gemini-key-here', ROOMS_FILE: 'data/rooms.sample.json' } });
  t.after(() => proc.kill());
  await new Promise((resolve, reject) => {
    proc.stdout.on('data', (d) => String(d).includes('running at') && resolve());
    proc.on('exit', reject);
  });
  const get = (p) => fetch(`http://localhost:${PORT}${p}`);

  const rooms = await (await get('/api/rooms')).json();
  assert.ok(rooms.rooms.length >= 1);
  assert.ok('popularity' in rooms.rooms[0]);

  assert.equal((await get('/widget/rso-chat.js')).status, 200);
  assert.equal((await get('/demo.html')).status, 200);
  for (const p of ['/.env', '/.env.example', '/server.js', '/src/chat.js', '/test/server.test.js', '/data/forms.json', '/%2e%2e/%2e%2e/etc/passwd']) {
    assert.equal((await get(p)).status, 404, p);
  }
  const chat = await fetch(`http://localhost:${PORT}/api/chat`, { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) });
  assert.equal(chat.status, 500);
  assert.match((await chat.json()).error, /no real GEMINI_API_KEY/);
});
