// Local SVG classroom illustration used as the room photo placeholder.
const palettes = {
  warm: { wall: '#F3E6D3', floor: '#C9A27A', accent: '#990000', light: '#FFF6E0' },
  cool: { wall: '#E7E4DE', floor: '#A9A39A', accent: '#7A2E2E', light: '#F7F4EC' },
  dark: { wall: '#3A3533', floor: '#5B524D', accent: '#C9A13B', light: '#F1E3B8' },
};

export default function ClassroomArt({ tint = 'warm', label }) {
  const c = palettes[tint] || palettes.warm;
  return (
    <svg className="classroom-art" viewBox="0 0 320 200" role="img" aria-label={label || 'Classroom illustration'} preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="200" fill={c.wall} />
      <polygon points="0,130 320,130 320,200 0,200" fill={c.floor} />
      <polygon points="0,130 40,118 280,118 320,130" fill={c.floor} opacity="0.7" />
      {[50, 130, 210].map((x) => (
        <g key={x}>
          <rect x={x} y="14" width="60" height="6" rx="2" fill={c.light} />
          <rect x={x + 6} y="20" width="48" height="2" fill="#000" opacity="0.08" />
        </g>
      ))}
      <rect x="104" y="40" width="112" height="64" rx="3" fill={c.light} stroke="#000" strokeOpacity="0.12" />
      <rect x="112" y="48" width="96" height="48" rx="2" fill={c.accent} opacity="0.14" />
      <rect x="18" y="42" width="56" height="50" rx="3" fill="#fff" opacity="0.5" />
      <path d="M46 42v50M18 67h56" stroke={c.wall} strokeWidth="3" />
      <rect x="248" y="42" width="56" height="50" rx="3" fill="#fff" opacity="0.5" />
      <path d="M276 42v50M248 67h56" stroke={c.wall} strokeWidth="3" />
      {[140, 162, 184].map((y, row) => (
        <g key={y}>
          {[0, 1, 2, 3].map((i) => {
            const w = 52 + row * 8;
            const gap = 70 + row * 10;
            const startX = 160 - (gap * 3) / 2 - w / 2;
            return (
              <g key={i}>
                <rect x={startX + i * gap} y={y} width={w} height="7" rx="2" fill="#2A2422" opacity="0.78" />
                <rect x={startX + i * gap + 6} y={y + 7} width="3" height="8" fill="#2A2422" opacity="0.6" />
                <rect x={startX + i * gap + w - 9} y={y + 7} width="3" height="8" fill="#2A2422" opacity="0.6" />
              </g>
            );
          })}
        </g>
      ))}
      <rect x="146" y="112" width="28" height="18" rx="2" fill={c.accent} opacity="0.85" />
    </svg>
  );
}
