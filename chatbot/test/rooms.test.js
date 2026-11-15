// The chatbot must read the heatmap team's data/rooms.json format as-is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeRooms, loadRooms, recommendRooms, refreshRemote } from '../src/rooms.js';

// Exactly the first entry Amitesh pushed to c-rliang/Room-Booking-Website.
const AMITESH = {
  synthetic: true,
  description: 'Invented room data for the hackathon demo.',
  rooms: [{ id: 'demo-gfs-101', building_id: 'gfs', name: 'Demo GFS Room 101', floor: 1, capacity: 30, equipment: ['projector', 'whiteboard'], requests_last_30_days: 42, image_url: null }],
};

test('reads the heatmap format unchanged', () => {
  const { rooms, warnings } = normalizeRooms(AMITESH);
  assert.deepEqual(warnings, []);
  assert.equal(rooms[0].id, 'demo-gfs-101');
  assert.equal(rooms[0].requests_last_30_days, 42);
  assert.equal(rooms[0].popularity, 0.6); // 42 / 70, the heatmap's demo scale
  const rec = recommendRooms({ attendance: 20, needs: ['projector'] }, rooms);
  assert.equal(rec.recommended[0].id, 'demo-gfs-101');
  assert.equal(rec.recommended[0].floor, 1);
});

test('popularity uses the heatmap scale: 70+ requests = 1 (red)', () => {
  const { rooms } = normalizeRooms({ rooms: [
    { id: 'a', capacity: 10, requests_last_30_days: 90 },
    { id: 'b', capacity: 10, requests_last_30_days: 35 },
    { id: 'c', capacity: 10, requests_last_30_days: 7 },
  ] });
  assert.deepEqual(rooms.map((r) => r.popularity), [1, 0.5, 0.1]);
  assert.deepEqual(rooms.map((r) => r.popularity_label), ['High', 'Medium', 'Low']);
});

test('broken entries are skipped with a warning instead of crashing', () => {
  const { rooms, warnings } = normalizeRooms({ rooms: [
    { id: 'ok', capacity: 20, requests_last_30_days: 3 },
    { capacity: 20 },
    { id: 'ok', capacity: 20 },
    { id: 'bad-cap', capacity: 'lots' },
    { id: 'no-requests', capacity: 12 },
  ] });
  assert.deepEqual(rooms.map((r) => r.id), ['ok', 'no-requests']);
  assert.equal(rooms[1].requests_last_30_days, 0);
  assert.equal(warnings.length, 3);
});

test('new rooms appear after the file changes, and a half-saved file keeps the last good copy', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rooms-'));
  const file = path.join(dir, 'rooms.json');
  writeFileSync(file, JSON.stringify(AMITESH));
  assert.equal(loadRooms(file).rooms.length, 1);
  await new Promise((r) => setTimeout(r, 20));
  writeFileSync(file, JSON.stringify({ rooms: [...AMITESH.rooms, { id: 'demo-thh-208', building_id: 'thh', name: 'Demo THH Room 208', capacity: 30, equipment: [], requests_last_30_days: 5 }] }));
  assert.equal(loadRooms(file).rooms.length, 2);
  await new Promise((r) => setTimeout(r, 20));
  writeFileSync(file, '{ "rooms": [ {"id": ');
  assert.equal(loadRooms(file).rooms.length, 2);
});

test('GitHub sync: loads raw JSON, honours ETag 304, keeps the last copy on errors', async () => {
  const calls = [];
  const reply = (status, body, etag) => ({ ok: status < 300, status, headers: { get: (h) => (h === 'etag' ? etag : null) }, text: async () => body });
  const script = [
    () => reply(200, JSON.stringify(AMITESH), '"v1"'),
    (h) => { assert.equal(h['if-none-match'], '"v1"'); return reply(304, ''); },
    () => reply(500, 'oops'),
    () => reply(200, JSON.stringify({ content: Buffer.from(JSON.stringify({ rooms: [...AMITESH.rooms, { id: 'demo-kap-101', capacity: 40, requests_last_30_days: 10 }] })).toString('base64'), encoding: 'base64' }), '"v2"'),
  ];
  const fetchImpl = async (url, init) => { calls.push(url); return script.shift()(init.headers); };
  const url = 'https://api.github.com/repos/x/y/contents/rooms.json';
  assert.equal((await refreshRemote(url, fetchImpl)).count, 1);
  assert.equal((await refreshRemote(url, fetchImpl)).changed, false);
  assert.ok((await refreshRemote(url, fetchImpl)).error);
  assert.equal(loadRooms().rooms.length, 1); // last good copy kept
  assert.equal((await refreshRemote(url, fetchImpl)).count, 2);
  assert.equal(loadRooms().rooms.at(-1).id, 'demo-kap-101');
});
