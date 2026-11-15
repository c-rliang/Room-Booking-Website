/*
 * RSO Room Helper chat widget. Drop-in, no dependencies.
 *
 *   <div id="rso-chat" style="height: 600px"></div>
 *   <script src="/chatbot/widget/rso-chat.js"></script>
 *
 * Options (data attributes on the div):
 *   data-api="/api/chat"   chat endpoint (default: same server that served this script)
 *   data-title="Plan your event"
 *
 * Events fired on window (for the heatmap):
 *   'rso:rooms-recommended'  detail: { room_ids: [...], rooms: [...], plan }
 *   'rso:room-selected'      detail: { room_id, room }   (user clicked a room card)
 *
 * Calls the page can make:
 *   RSOChat.ask('Tell me about demo-gfs-101')   send a message as the user
 *   RSOChat.reset()                              clear the conversation
 *   or dispatch: window.dispatchEvent(new CustomEvent('rso:ask', { detail: { text } }))
 */
(() => {
  if (window.RSOChat) return;
  const scriptOrigin = (() => { try { return new URL(document.currentScript.src).origin; } catch { return ''; } })();

  const CSS = `
.rsoc{--rsoc-cardinal:#990000;--rsoc-gold:#ffcc00;--rsoc-ink:#1d1d1f;--rsoc-muted:#5f6368;--rsoc-line:#e3e3e6;--rsoc-bot:#f3f1ee;
  display:flex;flex-direction:column;height:100%;min-height:420px;background:#fff;color:var(--rsoc-ink);border:1px solid var(--rsoc-line);border-radius:12px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
.rsoc *{box-sizing:border-box}
.rsoc-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--rsoc-line)}
.rsoc-head h2{margin:0;font-size:16px}
.rsoc-reset{border:0;background:none;color:var(--rsoc-muted);font:inherit;font-size:13px;cursor:pointer}
.rsoc-msgs{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.rsoc-msg{max-width:90%;padding:10px 14px;border-radius:14px}
.rsoc-user{align-self:flex-end;background:var(--rsoc-cardinal);color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}
.rsoc-bot{align-self:flex-start;background:var(--rsoc-bot);border-bottom-left-radius:4px}
.rsoc-bot a{color:var(--rsoc-cardinal);word-break:break-all}
.rsoc-msg p{margin:0 0 8px}.rsoc-msg p:last-child{margin-bottom:0}
.rsoc-msg ol,.rsoc-msg ul{margin:4px 0 8px;padding-left:20px}
.rsoc-error{background:#fdecea;color:#8a1c1c}
.rsoc-typing{color:var(--rsoc-muted);font-style:italic}
.rsoc-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}
.rsoc-card{background:#fff;border:1px solid var(--rsoc-line);border-radius:10px;padding:8px 10px;text-align:left;cursor:pointer;font:inherit;font-size:13px;color:var(--rsoc-ink)}
.rsoc-card:hover,.rsoc-card:focus-visible{border-color:var(--rsoc-cardinal);outline:none}
.rsoc-card img{width:100%;height:72px;object-fit:cover;border-radius:6px;margin-bottom:6px}
.rsoc-card strong{display:block}
.rsoc-pop{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;margin-top:4px}
.rsoc-Low{background:#e6e6e6}.rsoc-Medium{background:#fde2c4}.rsoc-High{background:#f6c1bb}
.rsoc-ex{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 8px}
.rsoc-ex[hidden]{display:none}
.rsoc-ex button{border:1px solid var(--rsoc-line);background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer;color:var(--rsoc-ink)}
.rsoc-ex button:hover{border-color:var(--rsoc-cardinal);color:var(--rsoc-cardinal)}
.rsoc-form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--rsoc-line)}
.rsoc-form textarea{flex:1;resize:none;border:1px solid var(--rsoc-line);border-radius:10px;padding:10px;font:inherit;color:inherit}
.rsoc-form textarea:focus{outline:2px solid var(--rsoc-gold)}
.rsoc-form button{background:var(--rsoc-cardinal);color:#fff;border:0;border-radius:10px;padding:0 18px;font:inherit;font-weight:600;cursor:pointer}
.rsoc-form button:disabled{opacity:.5;cursor:default}`;

  const EXAMPLES = [
    ['Halloween social, 20 people', "I'm hosting a halloween social for my club, Open Alpha, which will have 20 people. We're going to eat candy and watch movies. We heavily prefer the event to occur on October 28th for 2 hours, anytime between 6pm and 10pm, but October 27th or 26th at the same times works too."],
    ['Weekly club meeting', 'Our consulting club wants a 1-hour meeting for about 30 members next Tuesday at 5pm. No food, we need a projector.'],
    ['Career workshop with pizza', "Can we hold a resume workshop with a recruiter on a Friday afternoon in late October for 15 people? There will be pizza and it's USG funded."],
  ];
  const GREETING = "Hi! Tell me about your event: your club, what it is, how many people, which dates and times work, and whether there's food. I'll tell you which forms and permits you need, the deadlines, and rooms with better odds.";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  function markdown(text) {
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (const raw of String(text).split('\n')) {
      const line = raw.trimEnd();
      const ol = line.match(/^\s*\d+[.)]\s+(.*)/), ul = line.match(/^\s*[-*•]\s+(.*)/);
      if (ol || ul) {
        const tag = ol ? 'ol' : 'ul';
        if (list !== tag) { close(); out.push(`<${tag}>`); list = tag; }
        out.push(`<li>${inline((ol || ul)[1])}</li>`);
      } else if (!line.trim()) close();
      else { close(); out.push(`<p>${inline(line.replace(/^#+\s*/, ''))}</p>`); }
    }
    close();
    return out.join('');
  }
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  function mount(host) {
    const api = host.dataset.api || `${scriptOrigin}/api/chat`;
    host.innerHTML = `
      <div class="rsoc" role="region" aria-label="Event planning chat">
        <div class="rsoc-head"><h2>${esc(host.dataset.title || 'Plan your event')}</h2><button type="button" class="rsoc-reset">Start over</button></div>
        <div class="rsoc-msgs" aria-live="polite"></div>
        <div class="rsoc-ex">${EXAMPLES.map(([label], i) => `<button type="button" data-i="${i}">${esc(label)}</button>`).join('')}</div>
        <form class="rsoc-form"><textarea rows="2" maxlength="2000" aria-label="Message" placeholder="Describe your event: club, what it is, people, dates and times, food..."></textarea><button type="submit">Send</button></form>
      </div>`;
    const $ = (sel) => host.querySelector(sel);
    const msgs = $('.rsoc-msgs'), ex = $('.rsoc-ex'), input = $('textarea'), sendBtn = $('.rsoc-form button');
    let history = [];
    let busy = false;

    function add(cls, html, extra) {
      const div = document.createElement('div');
      div.className = `rsoc-msg ${cls}`;
      div.innerHTML = html;
      if (extra) div.appendChild(extra);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }
    function cards(rooms) {
      const wrap = document.createElement('div');
      wrap.className = 'rsoc-cards';
      for (const r of rooms) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rsoc-card';
        b.dataset.roomId = r.id;
        b.innerHTML = `${r.image_url ? `<img src="${esc(r.image_url)}" alt="">` : ''}<strong>${esc(r.name)}</strong>${esc(r.capacity)} seats${r.floor != null ? ` · floor ${esc(r.floor)}` : ''}<br>${esc((r.equipment || []).join(', ').replace(/_/g, ' '))}<br><span class="rsoc-pop rsoc-${esc(r.popularity_label)}">${esc(r.popularity_label)} demand · ${esc(r.requests_last_30_days)} requests/30 days</span>`;
        b.addEventListener('click', () => emit('rso:room-selected', { room_id: r.id, room: r }));
        wrap.appendChild(b);
      }
      return wrap;
    }
    function reset() {
      history = [];
      msgs.innerHTML = '';
      ex.hidden = false;
      add('rsoc-bot', markdown(GREETING));
    }
    async function send(text) {
      text = String(text || '').trim();
      if (!text || busy) return;
      busy = true;
      ex.hidden = true;
      add('rsoc-user', esc(text));
      history.push({ role: 'user', content: text });
      input.value = '';
      sendBtn.disabled = true;
      const typing = add('rsoc-bot', '<span class="rsoc-typing">Checking the rules…</span>');
      try {
        const res = await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history }) });
        const data = await res.json().catch(() => ({}));
        typing.remove();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        const rooms = data.rooms?.recommended || [];
        add('rsoc-bot', markdown(data.reply || '(no reply)'), rooms.length ? cards(rooms) : null);
        history.push({ role: 'assistant', content: data.reply || '' });
        if (rooms.length) emit('rso:rooms-recommended', { room_ids: data.room_ids || rooms.map((r) => r.id), rooms, plan: data.plan || null });
      } catch (err) {
        typing.remove();
        history.pop();
        add('rsoc-bot rsoc-error', esc(err.message === 'Failed to fetch' ? 'Could not reach the chatbot server. Is `npm start` running?' : err.message));
      } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    $('.rsoc-form').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
    $('.rsoc-reset').addEventListener('click', reset);
    ex.addEventListener('click', (e) => { const i = e.target.closest('button')?.dataset.i; if (i != null) send(EXAMPLES[i][1]); });
    reset();
    return { ask: send, reset };
  }

  function init() {
    if (!document.getElementById('rsoc-style')) {
      const style = document.createElement('style');
      style.id = 'rsoc-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const hosts = document.querySelectorAll('#rso-chat, [data-rso-chat]');
    const widgets = [...hosts].map(mount);
    const first = widgets[0];
    window.RSOChat = { ask: (t) => first?.ask(t), reset: () => first?.reset() };
    window.addEventListener('rso:ask', (e) => first?.ask(e.detail?.text));
    if (!first) console.warn('[RSOChat] No <div id="rso-chat"> found on the page.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
