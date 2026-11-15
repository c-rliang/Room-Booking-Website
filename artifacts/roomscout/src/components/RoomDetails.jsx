import { useEffect, useRef } from 'react';
import ClassroomArt from './ClassroomArt.jsx';
import { IconClose, IconUsers, IconClock, IconCheck } from './Icons.jsx';
import { getBuilding, popularityLabel, popularityColor } from '../data/mockRooms.js';

export default function RoomDetails({ room, isRecommended, isChosen, onSelect, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [room.id]);
  const building = getBuilding(room.buildingId);
  return (
    <section className="drawer" role="dialog" aria-label={`${room.name} details`} data-testid="drawer-room">
      <div className="drawer-img"><ClassroomArt tint={room.tint} label={`Illustration of ${room.name}`} /></div>
      <div className="drawer-body">
        <div className="drawer-head">
          <div>
            <p className="eyebrow">{building?.name}</p>
            <h3 className="drawer-title" data-testid="text-room-name">{room.name}</h3>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close room details" data-testid="button-close-room"><IconClose /></button>
        </div>
        <div className="drawer-tags">
          <span className="pop-pill"><i style={{ background: room.legacy ? '#857c75' : popularityColor(room.popularity) }} />{room.legacy ? 'Archived fictional room' : `${room.requests_last_30_days} requests / 30 days · ${popularityLabel(room.popularity)}`}</span>
          {isRecommended && <span className="rec-pill">Recommended</span>}
        </div>
        <dl className="drawer-stats">
          <div><dt><IconUsers width="15" height="15" />Capacity</dt><dd>{room.capacity}</dd></div>
          <div><dt><IconClock width="15" height="15" />Floor</dt><dd>{room.floor ?? 'Archived'}</dd></div>
        </dl>
        <ul className="amenities">
          {room.amenities.map((a) => <li key={a}>{a}</li>)}
        </ul>
        <p className="sim-note">{room.legacy ? 'Saved legacy identity only. Not part of new recommendations.' : 'Synthetic demand, not availability. Food permission and accessibility are not verified; check official policy.'}</p>
        {!room.legacy && <div className="drawer-foot">
          <span className="sim-note">Local demo requests only</span>
          <button className={'btn btn-primary' + (isChosen ? ' is-chosen' : '')} onClick={() => onSelect(room.id)} data-testid="button-select-room">
            {isChosen ? <><IconCheck width="16" height="16" />Selected</> : 'Select room'}
          </button>
        </div>}
      </div>
    </section>
  );
}
