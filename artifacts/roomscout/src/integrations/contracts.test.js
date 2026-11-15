import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalog } from '@workspace/room-catalog';
import { mapChatReply, conversationHistory, safeLink } from './chat-model.js';
import { setRoomCatalog, getRoom, getActiveRoom, resolveRequestRoom, roomMatchesFilters } from '../data/mockRooms.js';
import { loadRequests, addRequest, getStorageWarning } from '../utils/storage.js';

test('catalog IDs and scale are unchanged across explorer and API contract', () => {
  const catalog = getCatalog();
  const rooms = setRoomCatalog(catalog);
  assert.deepEqual(rooms.map((r) => r.id), catalog.rooms.map((r) => r.id));
  assert.equal(getRoom('demo-gfs-101').popularity, 0.6);
  assert.equal(getRoom('demo-gfs-203').floor, 2);
  assert.equal(getRoom('demo-gfs-103').popularity, 1);
  assert.equal(getRoom('demo-gfs-101').food, null);
  assert.equal(getRoom('demo-gfs-101').accessible, null);
  assert.equal(roomMatchesFilters(getRoom('demo-gfs-102'), { minCapacity: 0, requiredEquipment: ['projector'] }), false);
  assert.equal(roomMatchesFilters(getRoom('demo-gfs-203'), { minCapacity: 30, requiredEquipment: ['speakers'] }), true);
});

test('legacy identities and unknown snapshots never become active GFS rooms', () => {
  assert.equal(getRoom('r-hw-112').name, 'Hawthorne 112');
  assert.equal(getActiveRoom('r-hw-112'), null);
  assert.equal(resolveRequestRoom({ roomId: 'lost', roomSnapshot: { id: 'lost', name: 'Saved identity' } }).name, 'Saved identity');
  assert.match(resolveRequestRoom({ roomId: 'missing' }).name, /missing/);
});

test('partial plan and no-match mapping never invent details or enable saving', () => {
  const mapped = mapChatReply({ reply: 'Which date?', plan: null, event: null, rooms: null });
  assert.equal(mapped.canSave, false); assert.equal(mapped.plan, null);
  const missing = mapChatReply({ reply: 'No valid date', plan: { best_option: null, steps: [] }, event: { attendance: 30 }, rooms: { recommended: [], no_match: 'No rooms' } });
  assert.equal(missing.plan.date, undefined);
  assert.equal(missing.plan.eventName, undefined);
  assert.equal(missing.noMatch, 'No rooms'); assert.equal(missing.canSave, false);
});

test('plan mapping uses exact captured input and recommendation IDs; blockers disable saving', () => {
  const data = {
    reply: 'Plan', event: { event_name: 'Workshop', attendance: 20, has_food: false },
    plan: { best_option: { date: '2026-10-28', start_time: '18:00', end_time: '19:50' }, steps: [{ title: 'Form', due: 'Tomorrow', url: 'https://example.org', after: 'Wait for confirmation' }], classroom_blockers: [] },
    rooms: { recommended: [{ id: 'demo-gfs-203' }] },
  };
  const mapped = mapChatReply(data);
  assert.equal(mapped.canSave, true);
  assert.deepEqual(mapped.recommendedRoomIds, ['demo-gfs-203']);
  assert.equal(mapped.forms[0].url, 'https://example.org');
  assert.equal(mapped.plan.projector, undefined);
  data.plan.classroom_blockers.push({ rule: 'R16' });
  assert.equal(mapChatReply(data).canSave, false);
  assert.equal(safeLink('javascript:alert(1)'), null);
});

test('history includes the full ordered conversation without UI metadata', () => {
  assert.deepEqual(conversationHistory([
    { role: 'user', text: 'Hello', id: 'one' },
    { role: 'assistant', text: 'How many?', policy: {} },
    { role: 'user', text: '20' },
  ]), [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'How many?' }, { role: 'user', content: '20' }]);
});

test('local requests survive reload, preserve IDs and refuse to overwrite corrupt storage', () => {
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  const old = { id: 'RS-old', roomId: 'r-hw-112', eventName: 'Old meeting' };
  window.localStorage.setItem('roomscout.requests.v1', JSON.stringify([old]));
  assert.equal(loadRequests()[0].roomId, 'r-hw-112');
  addRequest({ id: 'RS-new', roomId: 'demo-gfs-203', eventName: 'New meeting' });
  assert.equal(loadRequests().length, 2);
  assert.equal(loadRequests()[1].roomId, 'r-hw-112');
  window.localStorage.setItem('roomscout.requests.v1', '{broken');
  assert.deepEqual(loadRequests(), []);
  assert.ok(getStorageWarning());
  assert.throws(() => addRequest(old));
  assert.equal(window.localStorage.getItem('roomscout.requests.v1'), '{broken');
});
