export default function Header({ activePanel, onExplore, onPanelChange, requestCount }) {
  return (
    <header className="header">
      <div className="header-inner">
        <button className="brand" onClick={onExplore} data-testid="link-brand" aria-label="RoomScout, go to Explore Rooms">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 20V9l8-5 8 5v11h-5v-6H9v6z" fill="currentColor" /></svg>
          </span>
          RoomScout
        </button>
        <nav className="nav" aria-label="Main">
          <button className="nav-link" onClick={onExplore} data-testid="nav-explore">Explore Rooms</button>
          <button
            className={'nav-link' + (activePanel === 'plan' ? ' is-active' : '')}
            aria-pressed={activePanel === 'plan'}
            onClick={() => onPanelChange('plan')}
            data-testid="nav-plan"
          >Plan Event</button>
          <button
            className={'nav-link' + (activePanel === 'requests' ? ' is-active' : '')}
            aria-pressed={activePanel === 'requests'}
            onClick={() => onPanelChange('requests')}
            data-testid="nav-requests"
          >My Requests<span className="nav-count">{requestCount}</span></button>
        </nav>
      </div>
    </header>
  );
}
