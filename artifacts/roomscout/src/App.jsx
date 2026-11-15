import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import ExploreRooms from './components/ExploreRooms.jsx';
import MyRequests from './components/MyRequests.jsx';
import Toast from './components/Toast.jsx';
import ChatAdapter from './integrations/ChatAdapter.jsx';
import { rooms, getRoom } from './data/mockRooms.js';
import { seedRequests } from './data/mockRequests.js';
import { loadRequests, addRequest, makeRequestId } from './utils/storage.js';

const DEFAULT_FILTERS = { minCapacity: 0, projector: false, accessible: false, food: false };

function App() {
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
    setSelectedRoomId(id);
    if (window.innerWidth < 900) focusExplorer();
  }, [focusExplorer]);

  const handleChooseRoom = useCallback((id) => {
    setChosenRoomId(id);
    setActivePanel('plan');
    setToast({ id: Date.now(), title: `${getRoom(id).name} selected`, message: 'It will be used when you submit a room request.' });
  }, []);

  const handleSubmitRequest = useCallback(async (plan, roomId, forms) => {
    await new Promise((r) => setTimeout(r, 700)); // simulated, no network
    const req = {
      id: makeRequestId(), roomId, eventName: plan.eventName, eventDate: plan.date, eventTime: plan.time,
      attendance: plan.attendance, food: plan.food, forms, status: 'Submitted',
      submittedAt: new Date().toISOString(), notes: 'Submitted through RoomScout demo. Awaiting coordinator review.', isNew: true,
    };
    try {
      setSavedRequests(addRequest(req));
      setToast({ id: Date.now(), title: 'Room request submitted', message: `${getRoom(roomId).name} · ${req.id}. Find it in My Requests.` });
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
