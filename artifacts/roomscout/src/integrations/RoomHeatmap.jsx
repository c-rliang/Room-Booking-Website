import { useState } from 'react';
import './room-heatmap.css';
import { demandColor } from '@workspace/room-catalog';

function project(x, y, height = 0) {
  return [100 + x * 0.95 - y * 0.5, 100 + x * 0.15 + y * 0.55 - height];
}

function polygon(points) {
  return points.map((p) => p.join(',')).join(' ');
}

const reqOf = (r) => Number(r.requests_last_30_days ?? r.requests ?? 0) || 0;
const floorOf = (r) => Number(r.floor ?? 1);
const equipOf = (r) => (Array.isArray(r.equipment) ? r.equipment : []);

function mismatchReasons(room, filters) {
  const min = Number(filters?.minCapacity) || 0;
  const req = Array.isArray(filters?.requiredEquipment) ? filters.requiredEquipment : [];
  const eq = equipOf(room).map((e) => String(e).toLowerCase());
  const reasons = [];
  if ((Number(room.capacity) || 0) < min) reasons.push(`Seats ${room.capacity}; you need ${min}.`);
  req.forEach((item) => {
    if (!eq.includes(String(item).toLowerCase())) reasons.push(`Missing ${item}.`);
  });
  return reasons;
}

export default function RoomHeatmap({
  rooms = [],
  filters = { minCapacity: 0, requiredEquipment: [] },
  selectedRoomId = null,
  highlightedRoomIds = [],
  onRoomSelect = () => {},
}) {
  const list = Array.isArray(rooms) ? rooms : [];
  const floors = [...new Set(list.map(floorOf))].sort((a, b) => a - b);
  const [browsedFloor, setBrowsedFloor] = useState(null);

  const selectedRoom = list.find((r) => r.id === selectedRoomId);
  const fallbackFloor = floors.includes(browsedFloor) ? browsedFloor : floors[0] ?? 1;
  const floor = selectedRoom ? floorOf(selectedRoom) : fallbackFloor;
  const visibleRooms = list.filter((r) => floorOf(r) === floor);
  const matchCount = visibleRooms.filter((r) => mismatchReasons(r, filters).length === 0).length;

  if (list.length === 0) {
    return (
      <div className="rh">
        <div className="rh-empty" role="status">
          <p className="rh-empty-title">No rooms to map yet</p>
          <p>The room catalog is empty or still loading. Try again in a moment.</p>
        </div>
      </div>
    );
  }

  const columns = Math.max(1, visibleRooms.length);
  const floorCorners = [
    project(-30, -30, -8),
    project(columns * 180 - 10, -30, -8),
    project(columns * 180 - 10, 150, -8),
    project(-30, 150, -8),
  ];
  const xs = floorCorners.map(([x]) => x);
  const ys = floorCorners.map(([, y]) => y);
  const pad = 65;
  const viewBox = [
    Math.min(...xs) - pad,
    Math.min(...ys) - pad,
    Math.max(...xs) - Math.min(...xs) + pad * 2,
    Math.max(...ys) - Math.min(...ys) + pad * 2,
  ].join(' ');

  const select = (id) => onRoomSelect(id);

  return (
    <div className="rh">
      <div className="rh-head">
        <div>
          <h2 className="rh-title">Room demand by floor</h2>
          <p className="rh-sub">Select a room to open its details below the map.</p>
        </div>
        <div>
          <p className="rh-label" id="rh-floor-label">Choose floor</p>
          <div className="rh-floors" role="group" aria-labelledby="rh-floor-label">
            {floors.map((value) => {
              const count = list.filter((r) => floorOf(r) === value).length;
              const active = floor === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  data-testid={`button-floor-${value}`}
                  className={`rh-floor${active ? ' is-active' : ''}`}
                  onClick={() => {
                    setBrowsedFloor(value);
                    if (selectedRoomId != null) onRoomSelect(null);
                  }}
                >
                  <span className="rh-floor-name">Floor {value}</span>
                  <span className="rh-floor-count">{count} {count === 1 ? 'room' : 'rooms'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rh-bar">
        <p role="status" className="rh-status" data-testid="text-floor-match">
          {matchCount} of {visibleRooms.length} rooms match on Floor {floor}.
          {visibleRooms.length > 0 && matchCount === 0
            ? ' No matches here. Try another floor or relax your filters.'
            : matchCount < visibleRooms.length
              ? ' Faded rooms do not match your filters.'
              : ''}
        </p>
        <div className="rh-legend" aria-label="Simulated requests in last 30 days, 0 to 70 or more">
          <span className="rh-legend-title">Requests / 30 days (synthetic)</span>
          <div className="rh-legend-bar" aria-hidden="true" />
          <div className="rh-legend-scale" aria-hidden="true">
            <span>0</span><span>23</span><span>47</span><span>70+</span>
          </div>
        </div>
      </div>

      {visibleRooms.length === 0 ? (
        <div className="rh-empty"><p className="rh-empty-title">No rooms on Floor {floor}</p></div>
      ) : (
        <div className="rh-stage">
          {matchCount === 0 && (
            <div className="rh-nomatch" role="note">No rooms on this floor match your filters</div>
          )}
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="rh-svg"
            role="group"
            aria-label={`Simplified isometric room layout for floor ${floor}`}
          >
            <polygon points={polygon(floorCorners)} className="rh-slab" />
            {visibleRooms.map((room, index) => {
              const x = index * 180, y = 0, w = 140, d = 110, h = 24;
              const a = project(x, y, h), b = project(x + w, y, h);
              const c = project(x + w, y + d, h), dd = project(x, y + d, h);
              const bB = project(x + w, y), bC = project(x + w, y + d), bD = project(x, y + d);
              const center = project(x + w / 2, y + d / 2, h);
              const selected = selectedRoomId === room.id;
              const reasons = mismatchReasons(room, filters);
              const matches = reasons.length === 0;
              const recommended = highlightedRoomIds.includes(room.id);
              const requests = reqOf(room);
              const color = demandColor(requests);
              const name = String(room.name ?? room.id);
              const label = name.match(/\d+[A-Za-z]?$/)?.[0] ?? name;
              const cls = ['rh-room', !matches && 'is-dim', selected && 'is-sel', recommended && 'is-rec']
                .filter(Boolean).join(' ');
              return (
                <g
                  key={room.id}
                  className={cls}
                  role="button"
                  tabIndex={0}
                  data-testid={`map-room-${room.id}`}
                  aria-pressed={selected}
                  aria-label={`${name}, capacity ${room.capacity}, ${requests} simulated requests${recommended ? ', recommended' : ''}${matches ? '' : ', does not match filters'}`}
                  onClick={() => select(room.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(room.id); }
                    if (e.key === 'Escape' && selected) { e.preventDefault(); onRoomSelect(null); }
                  }}
                >
                  <title>{name}{matches ? ' - matches your filters' : ` - ${reasons.join(' ')}`}</title>
                  <polygon points={polygon([b, c, bC, bB])} fill={color} className="rh-wall" />
                  <polygon points={polygon([b, c, bC, bB])} className="rh-shade" fillOpacity="0.16" />
                  <polygon points={polygon([dd, c, bC, bD])} fill={color} className="rh-wall" />
                  <polygon points={polygon([dd, c, bC, bD])} className="rh-shade" fillOpacity="0.07" />
                  <polygon points={polygon([a, b, c, dd])} fill={color} className="rh-top" />
                  <text x={center[0]} y={center[1] - 3} className="rh-t1">{label}</text>
                  <text x={center[0]} y={center[1] + 17} className="rh-t2">{room.capacity} seats</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="rh-foot">
        <span className="rh-key"><i className="rh-key-sel" /> Selected</span>
        <span className="rh-key"><i className="rh-key-rec" /> Recommended</span>
        <span className="rh-key"><i className="rh-key-dim" /> Not matching filters</span>
        <span className="rh-note">Illustrative layout. Colors show synthetic demo demand, not live availability.</span>
      </div>
    </div>
  );
}
