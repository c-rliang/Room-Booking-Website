import { useState } from 'react';
import RequestDetails from './RequestDetails.jsx';
import { getRoom, getBuilding } from '../data/mockRooms.js';
import { IconDoc, IconCalendar, IconUsers } from './Icons.jsx';

const STATUSES = ['All', 'Submitted', 'Confirmed', 'Needs Action'];

export function StatusBadge({ status }) {
  const cls = status === 'Confirmed' ? 'ok' : status === 'Needs Action' ? 'warn' : 'info';
  return <span className={'badge badge-' + cls} data-testid="status-request">{status}</span>;
}

export const fmtDate = (d) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function MyRequests({ requests, onShowRoom, onPlan }) {
  const [filter, setFilter] = useState('All');
  const [openId, setOpenId] = useState(null);
  const shown = filter === 'All' ? requests : requests.filter((r) => r.status === filter);
  const open = requests.find((r) => r.id === openId);

  if (open) return <RequestDetails request={open} onBack={() => setOpenId(null)} onShowRoom={onShowRoom} />;

  return (
    <div className="requests">
      <div className="panel-head">
        <span className="panel-icon"><IconDoc /></span>
        <div>
          <h2 className="panel-title">My Requests</h2>
          <p className="panel-sub">Saved in this browser · statuses are simulated</p>
        </div>
      </div>
      <div className="seg" role="tablist" aria-label="Filter by status">
        {STATUSES.map((s) => {
          const n = s === 'All' ? requests.length : requests.filter((r) => r.status === s).length;
          return (
            <button key={s} role="tab" aria-selected={filter === s} className={'seg-btn' + (filter === s ? ' is-active' : '')} onClick={() => setFilter(s)} data-testid={`filter-${s}`}>
              {s}<span>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="req-list">
        {shown.length === 0 ? (
          <div className="empty">
            <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true"><rect x="20" y="14" width="80" height="56" rx="8" fill="#F3E9D6" /><rect x="32" y="28" width="40" height="6" rx="3" fill="#D9C7A3" /><rect x="32" y="42" width="56" height="5" rx="2.5" fill="#E7DAC0" /><rect x="32" y="53" width="30" height="5" rx="2.5" fill="#E7DAC0" /><circle cx="92" cy="18" r="10" fill="#990000" opacity="0.85" /></svg>
            <p className="empty-title">No {filter === 'All' ? '' : filter.toLowerCase() + ' '}requests</p>
            <p>{filter === 'All' ? 'Plan an event to submit your first room request.' : 'Nothing in this status right now.'}</p>
            {filter !== 'All' ? <button className="btn btn-ghost" onClick={() => setFilter('All')}>Show all</button> : <button className="btn btn-primary" onClick={onPlan}>Plan an event</button>}
          </div>
        ) : shown.map((r) => {
          const room = getRoom(r.roomId);
          return (
            <article key={r.id} className={'req-card' + (r.isNew ? ' is-new' : '')} data-testid={`card-request-${r.id}`}>
              <div className="req-top">
                <div>
                  <h3 className="req-name">{r.eventName}</h3>
                  <p className="req-room">{room?.name} · {getBuilding(room?.buildingId)?.name}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="req-meta">
                <span><IconCalendar width="14" height="14" />{fmtDate(r.eventDate)}, {r.eventTime}</span>
                <span><IconUsers width="14" height="14" />{r.attendance} people</span>
              </div>
              <div className="req-foot">
                <span className="mono">{r.id} · sent {fmtDate(r.submittedAt)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(r.id)} data-testid={`button-view-${r.id}`}>View details</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
