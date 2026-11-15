import { forwardRef } from 'react';
import HeatmapAdapter from '../integrations/HeatmapAdapter.jsx';
import RoomFilters from './RoomFilters.jsx';
import RoomDetails from './RoomDetails.jsx';
import { getRoom, getBuilding, roomMatchesFilters, popularityColor, DEFAULT_FILTERS } from '../data/mockRooms.js';

const ExploreRooms = forwardRef(function ExploreRooms(
  { rooms, catalogState, onRetryCatalog, filters, onFiltersChange, selectedRoomId, highlightedRoomIds, chosenRoomId, onRoomSelect, onRoomClose, onChooseRoom },
  ref,
) {
  const selected = selectedRoomId ? getRoom(selectedRoomId) : null;
  const matching = rooms.filter((r) => roomMatchesFilters(r, filters));
  const recs = highlightedRoomIds.map(getRoom).filter(Boolean);

  return (
    <section className="explore" ref={ref} tabIndex={-1} aria-labelledby="explore-title" id="explore">
      <div className="explore-head">
        <div>
          <p className="eyebrow">Explore Rooms</p>
          <h1 id="explore-title" className="page-title">Find the right room</h1>
        </div>
        <p className="demo-flag">Synthetic rooms · not live availability</p>
      </div>

      <RoomFilters rooms={rooms} filters={filters} onChange={onFiltersChange} matchCount={matching.length} total={rooms.length} />
      {catalogState === 'loading' && <p role="status" className="note-box">Loading sample room data…</p>}
      {catalogState === 'error' && <p role="alert" className="note-box warn">Room data is unavailable. <button className="link-btn" onClick={onRetryCatalog}>Retry room data</button></p>}

      <div className="map-card">
        <HeatmapAdapter
          rooms={rooms}
          filters={filters}
          selectedRoomId={selectedRoomId}
          highlightedRoomIds={highlightedRoomIds}
          onRoomSelect={onRoomSelect}
        />
      </div>
        {selected && (
          <RoomDetails
            key={selected.id}
            room={selected}
            isRecommended={highlightedRoomIds.includes(selected.id)}
            isChosen={chosenRoomId === selected.id}
            onSelect={onChooseRoom}
            onClose={onRoomClose}
          />
        )}
      {selectedRoomId && !selected && <p className="note-box">This saved room is not in the current catalog. Its original ID has been preserved.</p>}

      {recs.length > 0 && (
        <p className="rec-strip" aria-live="polite">
          <span className="rec-dot" />Highlighted from your plan: {recs.map((r) => r.name).join(', ')}
        </p>
      )}

      <div className="room-list-wrap">
        <h2 className="section-title">Matching rooms <span>{matching.length}</span></h2>
        {matching.length === 0 ? (
          <div className="empty small">
            <p className="empty-title">No rooms match these filters</p>
            <p>Try lowering the minimum capacity or turning off a requirement.</p>
            <button className="btn btn-ghost" onClick={() => onFiltersChange(DEFAULT_FILTERS)}>Clear filters</button>
          </div>
        ) : (
          <ul className="room-list">
            {matching.map((r) => (
              <li key={r.id}>
                <button
                  className={'room-row' + (r.id === selectedRoomId ? ' is-sel' : '') + (highlightedRoomIds.includes(r.id) ? ' is-hl' : '')}
                  onClick={() => onRoomSelect(r.id)}
                  data-testid={`row-room-${r.id}`}
                >
                  <i className="swatch" style={{ background: popularityColor(r.popularity) }} />
                  <span className="room-row-name">{r.name}<small>{getBuilding(r.buildingId)?.short}</small></span>
                  <span className="room-row-cap">{r.capacity}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
});

export default ExploreRooms;
