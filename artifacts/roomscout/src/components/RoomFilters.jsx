import { IconAccess, IconFood, IconProjector, IconUsers } from './Icons.jsx';

const toggles = [
  { key: 'projector', label: 'Projector', Icon: IconProjector },
  { key: 'accessible', label: 'Accessible', Icon: IconAccess },
  { key: 'food', label: 'Food allowed', Icon: IconFood },
];

export default function RoomFilters({ filters, onChange, matchCount, total }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const isDefault = !filters.projector && !filters.accessible && !filters.food && Number(filters.minCapacity) === 0;
  return (
    <div className="filters" role="group" aria-label="Room filters">
      <label className="cap-field">
        <IconUsers />
        <span className="cap-label">Min. capacity</span>
        <input
          type="number" min="0" max="200" step="5" inputMode="numeric"
          value={filters.minCapacity}
          onChange={(e) => set({ minCapacity: Math.max(0, Number(e.target.value) || 0) })}
          data-testid="input-min-capacity"
        />
      </label>
      {toggles.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={'chip' + (filters[key] ? ' is-on' : '')}
          aria-pressed={filters[key]}
          onClick={() => set({ [key]: !filters[key] })}
          data-testid={`toggle-${key}`}
        >
          <Icon width="16" height="16" />{label}
        </button>
      ))}
      <span className="filter-count" aria-live="polite">{matchCount} of {total} rooms</span>
      <button className="link-btn" disabled={isDefault} onClick={() => onChange({ minCapacity: 0, projector: false, accessible: false, food: false })} data-testid="button-reset-filters">Reset</button>
    </div>
  );
}
