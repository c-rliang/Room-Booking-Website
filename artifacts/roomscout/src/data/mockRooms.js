// Compatibility boundary: only active GFS rooms enter exploration/recommendations.
// Older fictional identities are resolved separately, never remapped by position.
import { rooms as legacyRooms, getBuilding as legacyBuilding } from './legacyRooms.js';
import { demandColor, popularityLabel } from '@workspace/room-catalog';

export let rooms = [];
export const DEFAULT_FILTERS = { minCapacity: 0, requiredEquipment: [] };
export function setRoomCatalog(catalog) {
  if (!catalog?.synthetic || !Array.isArray(catalog.rooms) || !catalog.rooms.length ||
      catalog.rooms.some((r) => !r.id || !Number.isFinite(r.capacity) || !Array.isArray(r.equipment)) ||
      new Set(catalog.rooms.map((r) => r.id)).size !== catalog.rooms.length) throw new Error('Room data is unavailable.');
  rooms = catalog.rooms.map((r) => ({
    ...r, buildingId: r.building_id, projector: r.equipment.includes('projector'),
    accessible: null, food: null, amenities: r.equipment,
    availability: 'Not verified', tint: 'warm',
  }));
  return rooms;
}
export const getActiveRoom = (id) => rooms.find((r) => r.id === id) || null;
export function getRoom(id) {
  return getActiveRoom(id) || (() => {
    const legacy = legacyRooms.find((r) => r.id === id);
    return legacy ? { ...legacy, legacy: true } : null;
  })();
}
export function resolveRequestRoom(request) {
  return getRoom(request.roomId) || request.roomSnapshot || {
    id: request.roomId, name: `Unknown saved room (${request.roomId || 'no ID'})`, legacy: true,
  };
}
export const getBuilding = (id) => id === 'gfs' ? { id, short: 'GFS · synthetic', name: 'GFS sample catalog' } : legacyBuilding(id);
export { popularityLabel };
export const popularityColor = (p) => demandColor(p * 70);
export function roomMatchesFilters(room, filters) {
  return room.capacity >= (Number(filters.minCapacity) || 0) &&
    (filters.requiredEquipment || []).every((item) => room.equipment?.includes(item));
}
