import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import ExploreRooms from './components/ExploreRooms.jsx';
import MyRequests from './components/MyRequests.jsx';
import Toast from './components/Toast.jsx';
import ChatAdapter from './integrations/ChatAdapter.jsx';
import { getRoom, getActiveRoom, setRoomCatalog, DEFAULT_FILTERS } from './data/mockRooms.js';
import { getRooms } from '@workspace/api-client-react';
import { seedRequests } from './data/mockRequests.js';
import { loadRequests, addRequest, makeRequestId, getStorageWarning } from './utils/storage.js';

function App() {
  const [rooms, setRooms] = useState([]);
  const [catalogState, setCatalogState] = useState('loading');
  const loadCatalog = useCallback(async () => {
    setCatalogState('loading');
    try {
      setRooms(setRoomCatalog(await getRooms()));
      setCatalogState('ready');
    } catch { setCatalogState('error'); }
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  const [activePanel, setActivePanel] = useState('plan');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [highlightedRoomIds, setHighlightedRoomIds] = useState([]);
  const [chosenRoomId, setChosenRoomId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [messages, setMessages] = useState([]);
  const [chatStage, setChatStage] = useState('idle');
  const [savedRequests, setSavedRequests] = useState(() => loadRequests());
  const [toast, setToast] = useState(null);
  const exploreRef = useRef(null);

  const requests = useMemo(
    () => [...savedRequests, ...seedRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [savedRequests],
  );

  // Escape closes the room drawer (request details handles its own Escape).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && selectedRoomId && !document.querySelector('.req-detail')) setSelectedRoomId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRoomId]);

  const focusExplorer = useCallback(() => {
    const el = exploreRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, []);

  const handleRecommend = useCallback((ids) => {
    setHighlightedRoomIds(ids);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleShowRoom = useCallback((id) => {
    setFilters(DEFAULT_FILTERS);
    setSelectedRoomId(id);
    if (window.innerWidth < 900) focusExplorer();
  }, [focusExplorer]);

  const handleChooseRoom = useCallback((id) => {
    if (!getActiveRoom(id)) return;
    setChosenRoomId(id);
    setActivePanel('plan');
    setToast({ id: Date.now(), title: `${getRoom(id).name} selected`, message: 'It will be used for your local demo request, not an official booking.' });
  }, []);

  const handleSubmitRequest = useCallback(async (plan, roomId, forms) => {
    const room = getActiveRoom(roomId);
    if (!room || !plan?.eventName || !plan?.date || !plan?.time || !plan?.attendance) throw new Error('Finish the event details and choose a current sample room first.');
    const req = {
      id: makeRequestId(), roomId, eventName: plan.eventName, eventDate: plan.date, eventTime: plan.time,
      attendance: plan.attendance, food: plan.food, forms, status: 'Submitted', roomSnapshot: room,
      submittedAt: new Date().toISOString(), notes: 'Local demo record only. Not sent to USC, not an official form submission or reservation.', isNew: true,
    };
    try {
      setSavedRequests(addRequest(req));
      setToast({ id: Date.now(), title: 'Demo request saved locally', message: `${room.name} · ${req.id}. Nothing was submitted to the university.` });
    } catch (e) {
      setToast({ id: Date.now(), type: 'error', title: 'Could not save request', message: e.message });
      throw e;
    }
    return req;
  }, []);

  return (
    <div className="app">
      <a className="skip" href="#right-panel">Skip to {activePanel === 'plan' ? 'planner' : 'requests'}</a>
      <Header activePanel={activePanel} onExplore={focusExplorer} onPanelChange={setActivePanel} requestCount={requests.length} />
      <main className="layout">
        <ExploreRooms
          ref={exploreRef}
          rooms={rooms}
          catalogState={catalogState}
          onRetryCatalog={loadCatalog}
          filters={filters}
          onFiltersChange={setFilters}
          selectedRoomId={selectedRoomId}
          highlightedRoomIds={highlightedRoomIds}
          chosenRoomId={chosenRoomId}
          onRoomSelect={setSelectedRoomId}
          onRoomClose={() => setSelectedRoomId(null)}
          onChooseRoom={handleChooseRoom}
        />
        <aside className="side" id="right-panel" aria-label={activePanel === 'plan' ? 'Plan Event' : 'My Requests'}>
          <div className="side-card">
            {getStorageWarning() && <p className="note-box warn" role="alert">{getStorageWarning()}</p>}
            <div className="side-view" hidden={activePanel !== 'plan'}>
              <ChatAdapter
                messages={messages}
                onMessagesChange={setMessages}
                stage={chatStage}
                onStageChange={setChatStage}
                selectedRoomId={selectedRoomId}
                chosenRoomId={chosenRoomId}
                onRecommend={handleRecommend}
                onRoomSelect={handleShowRoom}
                onSubmitRequest={handleSubmitRequest}
              />
            </div>
            {activePanel === 'requests' && (
              <div className="side-view fade-in">
                <MyRequests requests={requests} onShowRoom={handleShowRoom} onPlan={() => setActivePanel('plan')} />
              </div>
            )}
          </div>
        </aside>
      </main>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default App;
