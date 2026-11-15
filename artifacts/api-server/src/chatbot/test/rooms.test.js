// The chatbot must read the heatmap team's data/rooms.json format as-is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRooms, loadRooms, recommendRooms } from '../src/rooms.js';

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

test('integration uses only local GFS sample rooms, never legacy recommendations or GitHub polling', () => {
  const catalog = loadRooms();
  assert.equal(catalog.synthetic, true);
  assert.equal(catalog.rooms.length, 8);
  assert.equal(new Set(catalog.rooms.map((r) => r.id)).size, 8);
  assert.deepEqual([...new Set(catalog.rooms.map((r) => r.floor))], [1, 2]);
  assert.ok(recommendRooms({ attendance: 20, needs: ['projector'] }).recommended.every((r) => r.id.startsWith('demo-gfs-')));
  assert.equal(recommendRooms({ attendance: 5000 }).matched, 0);
});
