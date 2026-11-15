import { DEFAULT_FILTERS } from '../data/mockRooms.js';
export default function RoomFilters({ rooms, filters, onChange, matchCount, total }) {
  const equipment = [...new Set(rooms.flatMap((r) => r.equipment))].sort();
  return (
    <div className="filters" role="group" aria-label="Room filters">
      <label className="cap-field">
        Min. capacity
        <input type="number" min="0" max="5000" step="1" value={filters.minCapacity}
          onChange={(e) => onChange({ ...filters, minCapacity: Math.max(0, Math.min(5000, Math.floor(Number(e.target.value) || 0))) })}
          data-testid="input-min-capacity" />
      </label>
      {equipment.map((item) => {
        const active = filters.requiredEquipment.includes(item);
        return <button key={item} className={'chip' + (active ? ' is-on' : '')} aria-pressed={active}
          onClick={() => onChange({ ...filters, requiredEquipment: active ? filters.requiredEquipment.filter((v) => v !== item) : [...filters.requiredEquipment, item] })}
          data-testid={`toggle-${item}`}>{item}</button>;
      })}
      <span className="filter-count" aria-live="polite">{matchCount} of {total} rooms</span>
      <button className="link-btn" onClick={() => onChange(DEFAULT_FILTERS)} data-testid="button-reset-filters">Reset</button>
    </div>
  );
}
