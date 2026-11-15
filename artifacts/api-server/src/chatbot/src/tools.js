import { planEvent } from './rules.js';
import { recommendRooms, equipmentVocabulary, loadRooms } from './rooms.js';

const time = { type: 'string', pattern: '^([01]\\d|2[0-4]):[0-5]\\d$' };

/** Tool definitions. Built per request so the equipment list follows data/rooms.json. */
export function getTools() {
  const equipment = equipmentVocabulary();
  return [
  {
    name: 'plan_event',
    description:
      'Runs the official USC classroom-request rules on an event: checks each candidate date (term weeks, holidays, earliest start time, submission deadlines) and works out which forms and permits are required, with deadlines. Always use this instead of guessing any rule or date.',
    input_schema: {
      type: 'object',
      properties: {
        club_name: { type: 'string' },
        event_purpose: { type: 'string', description: 'e.g. "Halloween social with movies"' },
        attendance: { type: 'integer', minimum: 1 },
        has_food: { type: 'boolean' },
        funding: { type: 'string', enum: ['USG', 'GSG', 'none'] },
        career_related: { type: 'boolean' },
        needs_dps: { type: 'boolean', description: 'High-profile guests or anything needing Department of Public Safety' },
        health_activities: { type: 'boolean' },
        minors: { type: 'boolean', description: 'Anyone under 18 attending' },
        fundraising: { type: 'boolean', description: 'Selling anything or collecting money/donations' },
        event_name: { type: 'string' },
        event_type: { type: 'string', description: 'e.g. Meeting, Social, Workshop, Speaker' },
        audience: { type: 'string', description: 'USC Students, USC Staff/Faculty, or Other' },
        amplified_sound: { type: 'boolean', description: 'Microphone, speakers or music' },
        filming: { type: 'boolean' },
        cosponsored: { type: 'boolean', description: 'Co-sponsored by another organization' },
        political_guest: { type: 'boolean', description: 'Elected official or candidate for public office attending' },
        options: {
          type: 'array', minItems: 1, maxItems: 6,
          description: 'Candidate dates in order of preference',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              window_start: time,
              window_end: time,
              duration_minutes: { type: 'integer', minimum: 15, maximum: 720 },
            },
            required: ['date', 'window_start', 'window_end', 'duration_minutes'],
          },
        },
      },
      required: ['club_name', 'attendance', 'has_food', 'options'],
    },
  },
  {
    name: 'recommend_rooms',
    description:
      'Finds classrooms that fit the group and equipment needs, ranked so less-booked (less competitive) rooms come first. Popularity is historical, not live availability.',
    input_schema: {
      type: 'object',
      properties: {
        attendance: { type: 'integer', minimum: 1 },
        needs: {
          type: 'array',
          items: { type: 'string' },
          description: `Required equipment. Use only these names: ${equipment.join(', ') || 'projector, whiteboard'}`,
        },
        buildings: { type: 'array', items: { type: 'string' }, description: 'building_id values (lowercase, e.g. gfs, thh) if the user prefers a building' },
        limit: { type: 'integer', minimum: 1, maximum: 6 },
      },
      required: ['attendance'],
    },
  },
  {
    name: 'room_details',
    description: 'Looks up specific rooms by id (for example when the user clicks a room on the map). Returns capacity, equipment and popularity.',
    input_schema: {
      type: 'object',
      properties: { room_ids: { type: 'array', items: { type: 'string' }, maxItems: 6 } },
      required: ['room_ids'],
    },
  },
  ];
}

function roomDetails(input) {
  const ids = (input?.room_ids || []).slice(0, 6).map(String);
  const all = loadRooms().rooms;
  return {
    rooms: all.filter((r) => ids.includes(r.id)),
    not_found: ids.filter((id) => !all.some((r) => r.id === id)),
    note: 'Popularity is based on requests in the last 30 days (SAMPLE data), not live availability.',
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/;

/** Checks plan_event input ourselves, since not every model enforces the schema. */
function validatePlan(input) {
  if (!input || typeof input !== 'object') return 'input must be an object';
  if (!Number.isFinite(Number(input.attendance)) || Number(input.attendance) < 1) return 'attendance must be a positive number';
  if (!Array.isArray(input.options) || input.options.length === 0) return 'options must list at least one date';
  if (input.options.length > 6) return 'at most 6 date options';
  for (const o of input.options) {
    if (!DATE_RE.test(o?.date || '')) return `date "${o?.date}" must be YYYY-MM-DD`;
    if (Number.isNaN(Date.parse(o.date)) || new Date(o.date).toISOString().slice(0, 10) !== o.date) return 'date must be a real calendar date';
    if (!o.window_start || !o.window_end || !Number.isInteger(o.duration_minutes)) return 'each option needs start, end and an integer duration';
    for (const k of ['window_start', 'window_end']) if (o[k] && !TIME_RE.test(o[k])) return `${k} "${o[k]}" must be HH:MM (24-hour)`;
    if (o.duration_minutes && (o.duration_minutes < 15 || o.duration_minutes > 720)) return 'duration_minutes must be 15–720';
  }
  if (typeof input.club_name !== 'string' || !input.club_name.trim() || input.club_name.length > 200) return 'club_name is required (up to 200 characters)';
  if (!Number.isInteger(input.attendance) || input.attendance > 5000) return 'attendance must be an integer up to 5000';
  if (typeof input.has_food !== 'boolean') return 'has_food must be a boolean';
  for (const k of ['event_name', 'event_purpose', 'event_type', 'audience']) {
    if (input[k] !== undefined && (typeof input[k] !== 'string' || input[k].length > 2000)) return `${k} must be text up to 2000 characters`;
  }
  if (input.funding !== undefined && !['USG', 'GSG', 'none'].includes(input.funding)) return 'funding must be USG, GSG, or none';
  for (const k of ['career_related', 'needs_dps', 'health_activities', 'minors', 'fundraising', 'amplified_sound', 'filming', 'cosponsored', 'political_guest']) {
    if (input[k] !== undefined && typeof input[k] !== 'boolean') return `${k} must be a boolean`;
  }
  return null;
}

export function runTool(name, input, now) {
  try {
    if (name === 'plan_event') {
      const problem = validatePlan(input);
      return problem ? { error: `Invalid input: ${problem}. Fix it and call plan_event again.` } : planEvent(input, now);
    }
    if (name === 'recommend_rooms') {
      if (!input || !Number.isInteger(input.attendance) || input.attendance < 1 || input.attendance > 5000 ||
          ['needs', 'buildings'].some((k) => input[k] !== undefined && (!Array.isArray(input[k]) || input[k].length > 20 || input[k].some((x) => typeof x !== 'string')))) return { error: 'Invalid room query; provide attendance and equipment/building arrays.' };
      return recommendRooms(input);
    }
    if (name === 'room_details') return roomDetails(input);
    return { error: `Unknown tool ${name}` };
  } catch (err) {
    return { error: `Tool failed: ${err.message}` };
  }
}
