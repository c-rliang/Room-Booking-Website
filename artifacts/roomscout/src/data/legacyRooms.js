// Fictional campus data. Popularity is 0-100 (simulated demo values).
// Building shapes are SVG path strings in a 800 x 520 map space.

export const buildings = [
  { id: 'hawthorne', name: 'Hawthorne Hall', short: 'Hawthorne', label: [150, 150],
    path: 'M80 96 h120 v34 h22 v62 h-22 v34 h-120 v-40 h-18 v-50 h18 z' },
  { id: 'marlowe', name: 'Marlowe Library', short: 'Marlowe Library', label: [318, 262],
    path: 'M244 208 h96 l30 30 v74 h-48 v26 h-52 v-26 h-26 z' },
  { id: 'castillo', name: 'Castillo Student Center', short: 'Castillo Center', label: [432, 148],
    path: 'M372 108 q60 -34 120 0 v84 h-34 v20 h-52 v-20 h-34 z' },
  { id: 'ridley', name: 'Ridley Science Annex', short: 'Ridley Annex', label: [624, 252],
    path: 'M560 206 h134 v40 h-40 v58 h-54 v-58 h-40 z' },
  { id: 'okafor', name: 'Okafor Arts Pavilion', short: 'Okafor Arts', label: [170, 392],
    path: 'M98 352 l72 -30 l72 30 v62 h-144 z' },
  { id: 'vance', name: 'Vance Engineering', short: 'Vance Eng.', label: [604, 412],
    path: 'M530 370 h70 v-18 h80 v62 h-30 v24 h-120 z' },
  { id: 'pemberton', name: 'Pemberton Hall', short: 'Pemberton', label: [626, 108],
    path: 'M566 72 h120 v70 h-120 z' },
];

export const rooms = [
  { id: 'r-hw-112', buildingId: 'hawthorne', name: 'Hawthorne 112', capacity: 28, projector: true, accessible: true, food: true,
    popularity: 64, availability: 'Open Fri 6-10 PM', amenities: ['Projector', 'Movable tables', 'Blackout shades', 'Sound bar'], x: 120, y: 132, tint: 'warm' },
  { id: 'r-hw-210', buildingId: 'hawthorne', name: 'Hawthorne 210', capacity: 60, projector: true, accessible: true, food: false,
    popularity: 71, availability: 'Open Tue, Thu evenings', amenities: ['Projector', 'Tiered seating', 'Lectern mic'], x: 176, y: 178, tint: 'cool' },
  { id: 'r-ml-101', buildingId: 'marlowe', name: 'Marlowe 101 Reading Room', capacity: 40, projector: false, accessible: true, food: false,
    popularity: 88, availability: 'Limited - weekdays only', amenities: ['Quiet zone', 'Long tables', 'Natural light'], x: 270, y: 236, tint: 'cool' },
  { id: 'r-ml-b14', buildingId: 'marlowe', name: 'Marlowe B14 Media Lab', capacity: 22, projector: true, accessible: true, food: false,
    popularity: 92, availability: 'Booked most evenings', amenities: ['Projector', 'Surround audio', 'Dimmable lights'], x: 340, y: 286, tint: 'dark' },
  { id: 'r-cs-lounge', buildingId: 'castillo', name: 'Castillo Commons Lounge', capacity: 45, projector: true, accessible: true, food: true,
    popularity: 83, availability: 'Open Fri 7-11 PM', amenities: ['Projector', 'Lounge seating', 'Kitchenette', 'Catering OK'], x: 404, y: 140, tint: 'warm' },
  { id: 'r-cs-204', buildingId: 'castillo', name: 'Castillo 204', capacity: 18, projector: false, accessible: true, food: true,
    popularity: 47, availability: 'Open most days', amenities: ['Whiteboard', 'Round tables'], x: 466, y: 162, tint: 'warm' },
  { id: 'r-rd-150', buildingId: 'ridley', name: 'Ridley 150', capacity: 90, projector: true, accessible: true, food: false,
    popularity: 58, availability: 'Open weekends', amenities: ['Dual projectors', 'Lecture seating', 'Recording'], x: 590, y: 226, tint: 'cool' },
  { id: 'r-rd-033', buildingId: 'ridley', name: 'Ridley 033 Seminar', capacity: 14, projector: true, accessible: false, food: false,
    popularity: 21, availability: 'Wide open', amenities: ['Display screen', 'Seminar table'], x: 652, y: 228, tint: 'cool' },
  { id: 'r-ok-studio', buildingId: 'okafor', name: 'Okafor Black Box Studio', capacity: 35, projector: true, accessible: true, food: true,
    popularity: 76, availability: 'Open Thu-Sat evenings', amenities: ['Projector', 'Stage lighting', 'Flexible floor', 'Food OK'], x: 140, y: 384, tint: 'dark' },
  { id: 'r-ok-120', buildingId: 'okafor', name: 'Okafor 120 Gallery', capacity: 50, projector: false, accessible: true, food: true,
    popularity: 39, availability: 'Open weekends', amenities: ['Gallery walls', 'Standing room', 'Food OK'], x: 206, y: 392, tint: 'warm' },
  { id: 'r-vn-305', buildingId: 'vance', name: 'Vance 305', capacity: 24, projector: true, accessible: true, food: true,
    popularity: 33, availability: 'Open Fri evenings', amenities: ['Projector', 'Movable chairs', 'Food OK', 'Whiteboard'], x: 572, y: 400, tint: 'cool' },
  { id: 'r-vn-118', buildingId: 'vance', name: 'Vance 118 Maker Space', capacity: 30, projector: false, accessible: false, food: false,
    popularity: 18, availability: 'Staffed hours only', amenities: ['Workbenches', 'Tool wall'], x: 650, y: 384, tint: 'dark' },
  { id: 'r-pb-020', buildingId: 'pemberton', name: 'Pemberton 020', capacity: 20, projector: true, accessible: true, food: false,
    popularity: 27, availability: 'Open most evenings', amenities: ['Projector', 'U-shaped tables'], x: 600, y: 104, tint: 'cool' },
];

export function getRoom(id) {
  return rooms.find((r) => r.id === id) || null;
}

export function getBuilding(id) {
  return buildings.find((b) => b.id === id) || null;
}

export function popularityLabel(p) {
  if (p >= 75) return 'Very popular';
  if (p >= 50) return 'Popular';
  if (p >= 30) return 'Moderate';
  return 'Quiet';
}

// Cardinal (popular) to gray (less popular)
export function popularityColor(p) {
  if (p >= 75) return '#990000';
  if (p >= 50) return '#C0453A';
  if (p >= 30) return '#D9A79B';
  return '#B9B4AC';
}

export function roomMatchesFilters(room, filters) {
  if (room.capacity < (Number(filters.minCapacity) || 0)) return false;
  if (filters.projector && !room.projector) return false;
  if (filters.accessible && !room.accessible) return false;
  if (filters.food && !room.food) return false;
  return true;
}
