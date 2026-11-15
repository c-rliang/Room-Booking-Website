import { useEffect, useRef } from 'react';
import { getRoom, getBuilding } from '../data/mockRooms.js';
import { StatusBadge, fmtDate } from './MyRequests.jsx';
import ClassroomArt from './ClassroomArt.jsx';
import { IconChevron, IconDoc, IconPin } from './Icons.jsx';

export default function RequestDetails({ request, onBack, onShowRoom }) {
  const backRef = useRef(null);
  const backFn = useRef(onBack);
  backFn.current = onBack;
  useEffect(() => {
    backRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') backFn.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const room = getRoom(request.roomId);
  const rows = [
    ['Request ID', request.id],
    ['Event date', fmtDate(request.eventDate)],
    ['Time', request.eventTime],
    ['Attendance', `${request.attendance} people`],
    ['Food served', request.food ? 'Yes' : 'No'],
    ['Submitted', new Date(request.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })],
  ];
  return (
    <div className="req-detail" role="region" aria-label="Request details" data-testid="panel-request-details">
      <button ref={backRef} className="back-btn" onClick={onBack} data-testid="button-back-requests">
        <IconChevron style={{ transform: 'rotate(180deg)' }} width="16" height="16" />All requests <kbd>Esc</kbd>
      </button>
      <div className="detail-hero">
        <ClassroomArt tint={room?.tint} label={room?.name} />
      </div>
      <div className="req-top">
        <div>
          <h2 className="panel-title">{request.eventName}</h2>
          <p className="req-room">{room?.name} · {getBuilding(room?.buildingId)?.name}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <dl className="detail-grid">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <p className="block-title">Forms attached</p>
      <ul className="forms">
        {(request.forms || []).map((f) => <li key={f}><IconDoc width="16" height="16" /><span><strong>{f}</strong></span></li>)}
      </ul>
      {request.notes && <p className={'note-box' + (request.status === 'Needs Action' ? ' warn' : '')}>{request.notes}</p>}
      <button className="btn btn-ghost btn-block" onClick={() => onShowRoom(request.roomId)} data-testid="button-show-on-map"><IconPin width="16" height="16" />Show room on map</button>
    </div>
  );
}
