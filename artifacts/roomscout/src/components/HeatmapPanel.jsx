import { useMemo, useState } from 'react';
import { buildings, popularityColor, roomMatchesFilters } from '../data/mockRooms.js';
import { IconPlus, IconMinus } from './Icons.jsx';

// Temporary 2D heatmap. Replaceable via src/integrations/HeatmapAdapter.jsx.
export default function HeatmapPanel({ rooms, filters, selectedRoomId, highlightedRoomIds = [], onRoomSelect }) {
  const [zoom, setZoom] = useState(1);
  const [hoverBuilding, setHoverBuilding] = useState(null);

  const buildingStats = useMemo(() => {
    const stats = {};
    for (const b of buildings) {
      const list = rooms.filter((r) => r.buildingId === b.id);
      const avg = list.reduce((s, r) => s + r.popularity, 0) / (list.length || 1);
      const matches = list.filter((r) => roomMatchesFilters(r, filters));
      stats[b.id] = { avg, list, matches, highlighted: list.some((r) => highlightedRoomIds.includes(r.id)) };
    }
    return stats;
  }, [rooms, filters, highlightedRoomIds]);

  const selectBuilding = (id) => {
    const s = buildingStats[id];
    const pick = s.list.find((r) => highlightedRoomIds.includes(r.id) && roomMatchesFilters(r, filters)) || s.matches[0] || s.list[0];
    if (pick) onRoomSelect(pick.id);
  };

  const keyActivate = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };

  const vbW = 800 / zoom, vbH = 520 / zoom;
  const vb = `${(800 - vbW) / 2} ${(520 - vbH) / 2} ${vbW} ${vbH}`;

  return (
    <div className="map-wrap">
      <svg className="map" viewBox={vb} role="application" aria-label="Campus popularity map. Use Tab to move between buildings and rooms.">
        <defs>
          <pattern id="lawn" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="#E4E8D2" />
            <circle cx="3" cy="4" r="0.9" fill="#D3D9BC" /><circle cx="10" cy="10" r="0.9" fill="#D3D9BC" />
          </pattern>
          <filter id="bshadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#3A2A20" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect x="-400" y="-300" width="1600" height="1100" fill="#F1ECE1" />
        {/* lawns */}
        <path d="M40 60 h250 v210 h-250 z" fill="url(#lawn)" rx="20" />
        <path d="M350 80 h170 v150 h-170 z" fill="url(#lawn)" />
        <path d="M60 320 h220 v140 h-220 z" fill="url(#lawn)" />
        <ellipse cx="420" cy="380" rx="90" ry="62" fill="url(#lawn)" />
        <path d="M540 60 h180 v110 h-180 z" fill="url(#lawn)" />
        {/* pond */}
        <path d="M380 360 q30 -26 70 -6 q26 16 4 36 q-36 22 -74 0 q-18 -14 0 -30z" fill="#C9D8D6" stroke="#B3C7C4" />
        {/* paths */}
        <g fill="none" stroke="#FBF8F1" strokeLinecap="round">
          <path d="M0 290 C 200 280, 330 300, 520 300 S 760 290, 800 300" strokeWidth="22" />
          <path d="M520 0 C 515 120, 530 220, 520 300 S 500 460, 510 520" strokeWidth="18" />
          <path d="M300 520 C 310 440, 330 380, 340 300" strokeWidth="12" />
          <path d="M240 0 C 250 80, 300 150, 360 200" strokeWidth="10" />
          <path d="M520 300 Q 600 330 700 340" strokeWidth="9" />
        </g>
        <g fill="none" stroke="#E2D9C6" strokeDasharray="2 6" strokeLinecap="round" strokeWidth="2">
          <path d="M0 290 C 200 280, 330 300, 520 300 S 760 290, 800 300" />
          <path d="M520 0 C 515 120, 530 220, 520 300 S 500 460, 510 520" />
        </g>
        <circle cx="520" cy="300" r="26" fill="#FBF8F1" stroke="#E2D9C6" />
        <circle cx="520" cy="300" r="8" fill="#C9A13B" opacity="0.7" />
        {/* trees */}
        {[[60, 80], [270, 90], [70, 300], [300, 200], [360, 250], [500, 90], [740, 190], [760, 470], [460, 470], [260, 470], [40, 470], [720, 60], [470, 240]].map(([x, y]) => (
          <g key={`${x}-${y}`}><circle cx={x} cy={y + 2} r="10" fill="#9DAA86" opacity="0.35" /><circle cx={x} cy={y} r="9" fill="#AEB98F" /></g>
        ))}

        {/* buildings */}
        {buildings.map((b) => {
          const s = buildingStats[b.id];
          const dim = s.matches.length === 0;
          const isSel = s.list.some((r) => r.id === selectedRoomId);
          return (
            <g
              key={b.id}
              className={'bldg' + (dim ? ' is-dim' : '') + (isSel ? ' is-selected' : '') + (hoverBuilding === b.id ? ' is-hover' : '')}
              tabIndex={0}
              role="button"
              aria-label={`${b.name}, ${s.matches.length} matching rooms${s.highlighted ? ', has recommended rooms' : ''}`}
              onClick={() => selectBuilding(b.id)}
              onKeyDown={keyActivate(() => selectBuilding(b.id))}
              onMouseEnter={() => setHoverBuilding(b.id)}
              onMouseLeave={() => setHoverBuilding(null)}
              data-testid={`building-${b.id}`}
            >
              <path d={b.path} fill={popularityColor(s.avg)} filter="url(#bshadow)" className="bldg-shape" />
              {s.highlighted && <path d={b.path} className="bldg-ring" />}
              <text x={b.label[0]} y={b.label[1] + 26} className="bldg-label" textAnchor="middle">{b.short}</text>
            </g>
          );
        })}

        {/* room markers */}
        {rooms.map((r) => {
          const ok = roomMatchesFilters(r, filters);
          const hl = highlightedRoomIds.includes(r.id);
          const sel = r.id === selectedRoomId;
          return (
            <g
              key={r.id}
              className={'room-dot' + (ok ? '' : ' is-off') + (hl ? ' is-hl' : '') + (sel ? ' is-sel' : '')}
              transform={`translate(${r.x} ${r.y})`}
              tabIndex={ok ? 0 : -1}
              role="button"
              aria-label={`${r.name}, capacity ${r.capacity}${hl ? ', recommended' : ''}${ok ? '' : ', hidden by filters'}`}
              aria-pressed={sel}
              onClick={(e) => { e.stopPropagation(); if (ok) onRoomSelect(r.id); }}
              onKeyDown={keyActivate(() => ok && onRoomSelect(r.id))}
              data-testid={`room-marker-${r.id}`}
            >
              {hl && <circle r="15" className="hl-halo" />}
              <circle r={sel ? 9 : 7} className="dot-core" />
              {sel && (
                <g transform="translate(0 -14)">
                  <path d="M0 0 c-8 -10 -12 -14 -12 -20 a12 12 0 0124 0 c0 6 -4 10 -12 20z" fill="#990000" stroke="#FBF8F1" strokeWidth="2" />
                  <circle cy="-20" r="4.5" fill="#FBF8F1" />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="map-zoom">
        <button className="icon-btn" aria-label="Zoom in" disabled={zoom >= 1.6} onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))} data-testid="button-zoom-in"><IconPlus /></button>
        <button className="icon-btn" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))} data-testid="button-zoom-out"><IconMinus /></button>
      </div>

      <div className="legend" aria-label="Popularity legend">
        <p className="legend-title">Room popularity</p>
        <div className="legend-bar" />
        <div className="legend-scale"><span>Quiet</span><span>Popular</span></div>
        <div className="legend-row"><span className="legend-hl" />Recommended</div>
        <div className="legend-row"><span className="legend-dim" />No match for filters</div>
      </div>
    </div>
  );
}
