// Reads the heatmap team's rooms.json (shared format) and recommends rooms.
// Source: live from GitHub (polled, default outside the repo) or a local file
// (re-read whenever it changes). New rooms appear without a restart either way.
//
// Fields the chatbot depends on (please don't rename):
//   id, building_id, name, capacity, equipment[], requests_last_30_days
// Optional: floor, image_url (shown when present). Extra fields are passed through.

import { readFileSync, statSync } from 'node:fs';
import { ROOMS_FILE, ROOMS_URL, ROOMS_REFRESH_SECONDS, POPULARITY_FULL } from './config.js';

let cache = { file: null, mtimeMs: -1, rooms: [], warnings: [], source: null, updated_at: null };
let remote = { url: null, etag: null, cache: null, error: null, checked_at: null };

export const popularityLabel = (p) => (p >= 0.7 ? 'High' : p >= 0.4 ? 'Medium' : 'Low');

/** Validates raw entries, skips broken ones, and adds popularity (0–1 on the heatmap's scale: requests / POPULARITY_FULL). */
export function normalizeRooms(raw, full = POPULARITY_FULL) {
  const warnings = [];
  const list = Array.isArray(raw?.rooms) ? raw.rooms : Array.isArray(raw) ? raw : [];
  if (!list.length) warnings.push('No "rooms" array found.');
  const seen = new Set();
  const rooms = [];
  list.forEach((r, i) => {
    const where = `rooms[${i}]${r?.id ? ` (${r.id})` : ''}`;
    if (!r || typeof r.id !== 'string' || !r.id) return warnings.push(`${where}: missing "id", skipped`);
    if (seen.has(r.id)) return warnings.push(`${where}: duplicate id, skipped`);
    const capacity = Number(r.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) return warnings.push(`${where}: "capacity" must be a positive number, skipped`);
    const requests = Number(r.requests_last_30_days ?? 0);
    if (!Number.isFinite(requests) || requests < 0) return warnings.push(`${where}: "requests_last_30_days" must be 0 or more, skipped`);
    seen.add(r.id);
    rooms.push({
      ...r,
      building_id: String(r.building_id || '').toLowerCase(),
      name: r.name || r.id,
      capacity,
      equipment: Array.isArray(r.equipment) ? r.equipment.map((e) => String(e).toLowerCase()) : [],
      requests_last_30_days: requests,
      image_url: r.image_url ?? null,
    });
  });
  for (const r of rooms) {
    r.popularity = Math.round(Math.min(r.requests_last_30_days / full, 1) * 100) / 100;
    r.popularity_label = popularityLabel(r.popularity);
  }
  return { rooms, warnings };
}

/** Current rooms. Live GitHub copy when syncing (falls back to the local file until the first fetch succeeds). */
export function loadRooms(file = ROOMS_FILE) {
  if (remote.cache && file === ROOMS_FILE) return remote.cache;
  return loadFile(file);
}

/** Local file, cached until it changes. Keeps the last good copy if the file is mid-edit. */
function loadFile(file) {
  try {
    const { mtimeMs } = statSync(file);
    if (cache.file === file && cache.mtimeMs === mtimeMs) return cache;
    const { rooms, warnings } = normalizeRooms(JSON.parse(readFileSync(file, 'utf8')));
    cache = { file, mtimeMs, rooms, warnings, source: file, updated_at: new Date(mtimeMs).toISOString() };
    if (warnings.length) console.warn(`[rooms] ${file}:\n  ${warnings.join('\n  ')}`);
  } catch (err) {
    console.warn(`[rooms] could not read ${file}: ${err.message}${cache.rooms.length ? ' (using last good copy)' : ''}`);
  }
  return cache;
}

/** Fetches the room file from a URL (GitHub API or any raw JSON URL). Uses ETags, so unchanged files cost nothing. */
export async function refreshRemote(url = ROOMS_URL, fetchImpl = fetch) {
  if (!url) return null;
  remote.url = url;
  remote.checked_at = new Date().toISOString();
  try {
    const headers = { accept: 'application/vnd.github.raw+json', 'user-agent': 'rso-room-helper' };
    if (remote.etag) headers['if-none-match'] = remote.etag;
    if (process.env.GITHUB_TOKEN && /api\.github\.com/.test(url)) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetchImpl(url, { headers });
    if (res.status === 304) return { changed: false };
    if (!res.ok) throw new Error(res.status === 403 || res.status === 429 ? `HTTP ${res.status} (GitHub rate limit? raise ROOMS_REFRESH_SECONDS or set GITHUB_TOKEN)` : `HTTP ${res.status}`);
    const text = await res.text();
    let data = JSON.parse(text);
    if (data && data.encoding === 'base64' && data.content) data = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    const { rooms, warnings } = normalizeRooms(data);
    if (!rooms.length) throw new Error('no valid rooms in the file');
    const before = remote.cache?.rooms.length;
    remote.etag = res.headers.get('etag');
    remote.cache = { rooms, warnings, source: url, updated_at: new Date().toISOString() };
    remote.error = null;
    if (before !== rooms.length) console.log(`[rooms] synced ${rooms.length} rooms from GitHub`);
    if (warnings.length) console.warn(`[rooms] ${url}:\n  ${warnings.join('\n  ')}`);
    return { changed: true, count: rooms.length };
  } catch (err) {
    remote.error = err.message;
    console.warn(`[rooms] could not sync from ${url}: ${err.message} (keeping ${remote.cache ? 'last synced copy' : 'local file'})`);
    return { changed: false, error: err.message };
  }
}

/** Starts polling ROOMS_URL. Returns a stop function. */
export function startRemoteSync(url = ROOMS_URL, seconds = ROOMS_REFRESH_SECONDS, fetchImpl = fetch) {
  if (!url) return () => {};
  refreshRemote(url, fetchImpl);
  const timer = setInterval(() => refreshRemote(url, fetchImpl), seconds * 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}

/** Where rooms currently come from, for /api/rooms and the startup log. */
export const roomSourceInfo = () => ({
  mode: ROOMS_URL ? 'github' : 'file',
  live: Boolean(remote.cache),
  source: remote.cache ? remote.url : ROOMS_FILE,
  last_sync_error: remote.error,
  last_checked: remote.checked_at,
});

/** All equipment names that appear in the data, for the tool description. */
export const equipmentVocabulary = () => [...new Set(loadRooms().rooms.flatMap((r) => r.equipment))].sort();

const publicRoom = (r) => ({
  id: r.id, name: r.name, building_id: r.building_id, floor: r.floor ?? null, capacity: r.capacity,
  equipment: r.equipment, requests_last_30_days: r.requests_last_30_days,
  popularity: r.popularity, popularity_label: r.popularity_label, image_url: r.image_url,
});

/**
 * query = { attendance, needs: ['projector', ...], buildings?: ['gfs', ...], limit? }
 * Ranks rooms that fit by low demand first, with a penalty for rooms far too big.
 */
export function recommendRooms(query, rooms = loadRooms().rooms) {
  const attendance = Math.max(1, Number(query.attendance) || 1);
  const needs = (query.needs || []).map((n) => String(n).toLowerCase());
  const buildings = (query.buildings || []).map((b) => String(b).toLowerCase());
  const limit = Math.min(Number(query.limit) || 3, 6);

  const fits = rooms.filter((r) =>
    r.capacity >= attendance &&
    needs.every((n) => r.equipment.includes(n)) &&
    (!buildings.length || buildings.includes(r.building_id)));

  const ranked = fits
    .map((r) => {
      const oversize = r.capacity / attendance;
      return { r, score: r.popularity + (oversize > 3 ? 0.35 : oversize > 2 ? 0.15 : 0) };
    })
    .sort((a, b) => a.score - b.score)
    .map((x) => x.r);

  return {
    recommended: ranked.slice(0, limit).map(publicRoom),
    popular_rooms_that_also_fit: fits.filter((r) => r.popularity >= 0.7).slice(0, 2).map(publicRoom),
    matched: fits.length,
    note: 'Popularity = requests in the last 30 days on the heatmap scale (70+ = fully red; SAMPLE data). It shows how competitive a room is, not whether it is free on your date.',
    ...(fits.length === 0 ? { no_match: 'No room matches every requirement. Try fewer equipment needs, another building, or a smaller group size.' } : {}),
  };
}
