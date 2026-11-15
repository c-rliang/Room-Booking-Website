import { useEffect, useRef, useState } from 'react';
import RecommendationCard from './RecommendationCard.jsx';
import { getRoom } from '../data/mockRooms.js';
import { DEMO_PROMPT } from '../integrations/ChatAdapter.jsx';
import { conversationHistory } from '../integrations/chat-model.js';
import PolicyDetails, { SourceLink } from './PolicyDetails.jsx';
import { IconChat, IconSend, IconSpark, IconCalendar, IconClock, IconUsers, IconFood, IconProjector, IconDoc, IconCheck, IconAlert } from './Icons.jsx';

const STARTERS = [
  'What forms do I need for an event with food?',
  'Find a quiet room for a 12-person club meeting',
  'Which rooms have projectors?',
];

let msgSeq = 0;
const newId = () => `m${Date.now()}-${msgSeq++}`;

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function Plan({ plan }) {
  const items = [
    { Icon: IconSpark, k: 'Event', v: plan.eventName },
    { Icon: IconCalendar, k: 'Date', v: plan.date ? formatDate(plan.date) : 'Not confirmed' },
    { Icon: IconClock, k: 'Time', v: plan.time },
    { Icon: IconUsers, k: 'Attendance', v: plan.attendance ?? 'Not provided' },
    { Icon: IconFood, k: 'Food', v: plan.food == null ? 'Not provided' : plan.food ? 'Yes' : 'No' },
    { Icon: IconProjector, k: 'Projector', v: plan.projector == null ? 'See equipment' : plan.projector ? 'Yes' : 'No' },
  ];
  return (
    <dl className="plan-grid">
      {items.map(({ Icon, k, v }) => (
        <div key={k}><Icon width="16" height="16" /><dt>{k}</dt><dd>{v || 'Not provided'}</dd></div>
      ))}
    </dl>
  );
}

export default function ChatPanel({
  messages, onMessagesChange, stage, onStageChange,
  selectedRoomId, chosenRoomId, onRecommend, onRoomSelect, onSubmitRequest, getReply,
}) {
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const inflight = useRef(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; inflight.current?.abort(); }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [messages.length, typing]);

  const send = async (raw, retry = false) => {
    const text = raw.trim();
    if (!text || inflight.current) return;
    const next = retry ? messagesRef.current : [...messagesRef.current, { id: newId(), role: 'user', text }];
    const history = conversationHistory(next);
    if (history.length > 30) {
      setError({ message: 'This chat reached its 30-message limit. Start a new chat to continue.', text: null });
      return;
    }
    setInput('');
    setError(null);
    messagesRef.current = next;
    onMessagesChange(next);
    const controller = new AbortController();
    inflight.current = controller;
    const current = generation.current;
    setTyping(true);
    try {
      const reply = await getReply({ history, signal: controller.signal });
      if (current !== generation.current) return;
      onStageChange(reply.stage);
      onMessagesChange((m) => [...m, { id: newId(), role: 'assistant', ...reply }]);
      if (reply.recommendedRoomIds) onRecommend(reply.recommendedRoomIds);
    } catch (err) {
      if (current === generation.current && err.name !== 'AbortError') setError({ text, message: err.message });
    } finally {
      if (current === generation.current) { inflight.current = null; setTyping(false); }
    }
  };

  const submit = async (msg) => {
    const roomId = chosenRoomId && msg.recommendedRoomIds.includes(chosenRoomId) ? chosenRoomId : (msg.recommendedRoomIds.includes(selectedRoomId) ? selectedRoomId : msg.recommendedRoomIds[0]);
    setSubmitting(msg.id);
    setSaveError(null);
    try {
      const req = await onSubmitRequest(msg.plan, roomId, msg.forms.map((f) => f.name));
      onMessagesChange((m) => m.map((x) => (x.id === msg.id ? { ...x, submittedId: req.id, submittedRoomId: roomId } : x)));
    } catch (err) {
      setSaveError(err.message || 'Could not save this demo request. Please retry.');
    } finally {
      setSubmitting(null);
    }
  };

  const reset = () => {
    generation.current++;
    inflight.current?.abort();
    inflight.current = null;
    messagesRef.current = [];
    setTyping(false);
    onMessagesChange(() => []);
    onStageChange('idle');
    setError(null);
    setSaveError(null);
    onRecommend([]);
    inputRef.current?.focus();
  };

  return (
    <div className="chat">
      <div className="panel-head">
        <span className="panel-icon"><IconChat /></span>
        <div>
          <h2 className="panel-title">Plan your event</h2>
          <p className="panel-sub">Live assistant · local demo requests, no reservations</p>
        </div>
        {messages.length > 0 && <button className="link-btn" onClick={reset} data-testid="button-new-chat">New chat</button>}
      </div>

      <div className="chat-list" ref={listRef} aria-live="polite">
        <div className="msg assistant">
          <span className="avatar" aria-hidden="true">RS</span>
          <div className="bubble">Hi! I can help you find a room and walk through the request and permit steps. What are you planning?</div>
        </div>

        {messages.length === 0 && (
          <div className="starters">
            <button className="btn btn-gold" onClick={() => send(DEMO_PROMPT)} data-testid="button-try-demo"><IconSpark width="16" height="16" />Try example event</button>
            {STARTERS.map((s) => (
              <button key={s} className="starter" onClick={() => send(s)} data-testid="button-starter">{s}</button>
            ))}
          </div>
        )}

        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1;
          if (m.role === 'user') {
            return <div key={m.id} className="msg user"><div className="bubble">{m.text}</div></div>;
          }
          return (
            <div key={m.id} className="msg assistant">
              <span className="avatar" aria-hidden="true">RS</span>
              <div className="msg-stack">
                <div className="bubble">{m.text}</div>
                {m.followUpOptions && isLast && !typing && (
                  <div className="quick-replies">
                    {m.followUpOptions.map((o) => <button key={o} className="starter" onClick={() => send(o)}>{o}</button>)}
                  </div>
                )}
                {m.plan && <Plan plan={m.plan} />}
                {m.recommendedRoomIds?.length > 0 && (
                  <div className="block">
                    <p className="block-title">Recommended rooms</p>
                    <div className="rec-list">
                      {m.recommendedRoomIds.map(getRoom).filter(Boolean).map((r, i) => (
                        <RecommendationCard key={r.id} room={r} rank={i + 1} isSelected={selectedRoomId === r.id} isChosen={chosenRoomId === r.id} onClick={onRoomSelect} />
                      ))}
                    </div>
                  </div>
                )}
                {m.noMatch && <p className="note-box warn">{m.noMatch}</p>}
                {m.demandNote && <p className="disclaimer">{m.demandNote}</p>}
                {m.forms && (
                  <div className="block">
                    <p className="block-title">Forms and permits</p>
                    <ul className="forms">
                      {m.forms.map((f) => (
                        <li key={f.name}><IconDoc width="16" height="16" /><span><strong><SourceLink url={f.url}>{f.name}</SourceLink></strong><small>{f.detail}</small>{f.prepare?.length > 0 && <details><summary>What to prepare</summary><ul>{f.prepare.map((s) => <li key={s}>{s}</li>)}</ul></details>}</span><em>{f.deadline}</em></li>
                      ))}
                    </ul>
                    <p className="disclaimer">Links open official resources; nothing is submitted by RoomScout.</p>
                  </div>
                )}
                <PolicyDetails policy={m.policy} />
                {m.canSave && m.nextSteps && (
                  <div className="block">
                    <p className="block-title">Next steps</p>
                    <ol className="steps">{m.nextSteps.map((s) => <li key={s}><IconCheck width="14" height="14" />{s}</li>)}</ol>
                    {m.submittedId ? (
                       <p className="submitted-note" data-testid="text-submitted"><IconCheck width="16" height="16" />Saved locally: {getRoom(m.submittedRoomId)?.name} · {m.submittedId}. Not an official booking.</p>
                    ) : (
                      <button className="btn btn-primary btn-block" onClick={() => submit(m)} disabled={submitting === m.id} data-testid="button-submit-request">
                        {submitting === m.id ? <><span className="spinner" />Saving</> : `Save local demo request${chosenRoomId && m.recommendedRoomIds.includes(chosenRoomId) ? ` · ${getRoom(chosenRoomId)?.name}` : ''}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="msg assistant" aria-label="Assistant is typing">
            <span className="avatar" aria-hidden="true">RS</span>
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
        {error && (
          <div className="chat-error" role="alert">
            <IconAlert width="16" height="16" />{error.message}
            {error.text && <button className="link-btn" onClick={() => send(error.text, true)}>Retry</button>}
          </div>
        )}
        {saveError && <p className="chat-error" role="alert">{saveError}</p>}
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label className="sr-only" htmlFor="chat-input">Message</label>
        <input
          id="chat-input" ref={inputRef} value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={stage === 'awaiting-details' ? 'Which night and what hours?' : 'Describe your event...'}
          autoComplete="off" maxLength={2000} disabled={Boolean(error)} data-testid="input-chat"
        />
        <button className="send-btn" type="submit" disabled={!input.trim() || typing || Boolean(error)} aria-label="Send message" data-testid="button-send"><IconSend /></button>
      </form>
    </div>
  );
}
