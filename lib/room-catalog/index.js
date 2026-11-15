import raw from './rooms.json' with { type: 'json' };

export const POPULARITY_FULL = 70;
export const popularityLabel = (p) => p >= 0.7 ? 'High' : p >= 0.4 ? 'Medium' : 'Low';

// Single normalization contract for both API tools and explorer.
export function normalizeRooms(data, full = POPULARITY_FULL) {
  const list = Array.isArray(data?.rooms) ? data.rooms : Array.isArray(data) ? data : [];
  const warnings = [];
  const seen = new Set();
  const rooms = [];
  if (!list.length) warnings.push('No rooms found.');
  list.forEach((r, i) => {
    if (!r || typeof r.id !== 'string' || !r.id.trim() || seen.has(r.id) ||
        !Number.isFinite(Number(r.capacity)) || Number(r.capacity) <= 0 ||
        !Number.isFinite(Number(r.requests_last_30_days ?? 0)) || Number(r.requests_last_30_days ?? 0) < 0) {
      warnings.push(`Invalid or duplicate room at index ${i}.`);
      return;
    }
    seen.add(r.id);
    const popularity = Math.round(Math.min(Number(r.requests_last_30_days ?? 0) / full, 1) * 100) / 100;
    rooms.push({
      ...r, building_id: String(r.building_id || '').toLowerCase(),
      name: r.name || r.id, capacity: Number(r.capacity),
      equipment: Array.isArray(r.equipment) ? r.equipment.map((e) => String(e).toLowerCase()) : [],
      requests_last_30_days: Number(r.requests_last_30_days ?? 0), image_url: r.image_url ?? null,
      popularity, popularity_label: popularityLabel(popularity),
    });
  });
  return { rooms, warnings };
}

export function getCatalog() {
  const result = normalizeRooms(raw);
  if (result.warnings.length || !result.rooms.length) throw new Error('CATALOG_UNAVAILABLE');
  return {
    synthetic: raw.synthetic, description: raw.description,
    popularity_full: POPULARITY_FULL, rooms: result.rooms,
  };
}

export function demandColor(requests) {
  const stops = [[255, 255, 255], [255, 230, 0], [255, 140, 0], [255, 0, 0]];
  const value = Math.max(0, Math.min(requests / POPULARITY_FULL, 1)) * 3;
  const index = Math.min(Math.floor(value), 2);
  return `rgb(${stops[index].map((c, i) => Math.round(c + (stops[index + 1][i] - c) * (value - index))).join(', ')})`;
}
