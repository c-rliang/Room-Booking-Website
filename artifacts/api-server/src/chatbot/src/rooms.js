// The teammate's ranking policy, using the shared bundled local catalog only.
import { getCatalog } from '@workspace/room-catalog';
export { normalizeRooms, popularityLabel } from '@workspace/room-catalog';
export const loadRooms = () => getCatalog();
export const equipmentVocabulary = () => [...new Set(loadRooms().rooms.flatMap((r) => r.equipment))].sort();

const publicRoom = (r) => ({
  id: r.id, name: r.name, building_id: r.building_id, floor: r.floor ?? null, capacity: r.capacity,
  equipment: r.equipment, requests_last_30_days: r.requests_last_30_days,
  popularity: r.popularity, popularity_label: r.popularity_label, image_url: r.image_url,
});

export function recommendRooms(query, rooms = loadRooms().rooms) {
  const attendance = Math.max(1, Number(query.attendance) || 1);
  const needs = (query.needs || []).map((n) => String(n).toLowerCase());
  const buildings = (query.buildings || []).map((b) => String(b).toLowerCase());
  const limit = Math.max(1, Math.min(Number(query.limit) || 3, 6));
  const fits = rooms.filter((r) => r.capacity >= attendance &&
    needs.every((n) => r.equipment.includes(n)) &&
    (!buildings.length || buildings.includes(r.building_id)));
  const ranked = fits.map((r) => {
    const oversize = r.capacity / attendance;
    return { r, score: r.popularity + (oversize > 3 ? 0.35 : oversize > 2 ? 0.15 : 0) };
  }).sort((a, b) => a.score - b.score).map((x) => x.r);
  return {
    recommended: ranked.slice(0, limit).map(publicRoom),
    popular_rooms_that_also_fit: fits.filter((r) => r.popularity >= 0.7).slice(0, 2).map(publicRoom),
    matched: fits.length,
    note: 'Popularity = requests in the last 30 days on the heatmap scale (70+ = fully red; SAMPLE data). It shows how competitive a room is, not whether it is free on your date.',
    ...(fits.length === 0 ? { no_match: 'No room matches every requirement. Try fewer equipment needs, another building, or a smaller group size.' } : {}),
  };
}
