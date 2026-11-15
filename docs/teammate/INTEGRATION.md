# How the chatbot fits into the team repo

## Who owns what (as of 2026-11-14)

```
Room-Booking-Website/
├── web/                          ← heatmap, Next.js (Amitesh, branch feature/room-heatmap)
│   └── src/data/rooms.json       ← room data the chatbot reads
├── (ui-skeleton branch)          ← website skeleton, Replit React + Express (skeleton teammate)
└── chatbot/                      ← chatbot (Minxuan)
    ├── server.js                 ← chat API on port 8787
    ├── widget/rso-chat.js        ← the only file a web page loads
    ├── demo.html                 ← test page for the chatbot on its own
    ├── src/  data/  test/        ← chatbot internals
    └── .env                      ← API key (never commit; already in .gitignore)
```

The team still needs to pick **one** front end: the heatmap is a Next.js app and the skeleton is a Replit React app. The chatbot works with either, because it's a separate server plus one script tag.

## 1. Room data: live from GitHub

The chatbot reads Amitesh's `web/src/data/rooms.json` straight from GitHub and re-checks it every 90 seconds. When he pushes new rooms, they show up in the chat (and on `demo.html`) without anyone restarting anything.

- Outside the repo (e.g. the Downloads folder), GitHub sync is on by default.
- Inside the repo, it reads the local file instead; run `git pull` to update. Add `ROOMS_SOURCE=github` to `.env` to use live sync there too.
- If GitHub can't be reached, it keeps the last synced copy, and before the first sync it uses `data/rooms.sample.json`.
- After the heatmap branch is merged, set `ROOMS_GITHUB_REF=main` in `.env`.

Keep this shape:

```json
{
  "synthetic": true,
  "description": "...",
  "rooms": [
    {
      "id": "demo-gfs-101",
      "building_id": "gfs",
      "name": "Demo GFS Room 101",
      "floor": 1,
      "capacity": 30,
      "equipment": ["projector", "whiteboard"],
      "requests_last_30_days": 42,
      "image_url": null
    }
  ]
}
```

| Field | Chatbot needs it? | Notes |
| --- | --- | --- |
| `id` | **Required, don't rename** | Unique. The chatbot sends this exact id back to the map. |
| `capacity` | **Required** | Number > 0 |
| `requests_last_30_days` | **Required** | Number ≥ 0. Missing = 0. |
| `equipment` | **Required** | Array of lowercase words, spelled the same everywhere (`projector`, `speakers`, `microphone`, `whiteboard`). The chatbot learns the list from the file. |
| `building_id` | Used | Lowercase code from the Classroom Space Request Form's weekday list: `gfs`, `kap`, `lvl`, `ped`, `sal`, `sgm`, `slh`, `sos`, `ssl`, `thh`, `vhe`, `dmc`, `wph`, `zhs`. RSOs can't book classrooms outside that list. |
| `name` | Used | Shown in chat |
| `floor`, `image_url` | Optional | Shown on room cards when present |

Broken entries are skipped, not fatal, and the server prints which one.

**Popularity** uses the heatmap's own scale: `requests_last_30_days ÷ 70`, capped at 1 (70+ = red, matching `demandColor` in `web/src/app/page.tsx`). Labels: High ≥ 0.7, Medium ≥ 0.4, otherwise Low. If the heatmap's scale changes, set `POPULARITY_FULL` in `.env` to match.

## 2. Embedding the chat

Start the chatbot (`npm start` in `chatbot/`, port 8787), then add a div and the script to whichever front end the team picks. Give the div a height; the chat fills it.

**Plain HTML or Vite (`index.html`):**

```html
<div id="rso-chat" style="height: 600px"></div>
<script src="http://localhost:8787/chatbot/widget/rso-chat.js"></script>
```

**Next.js (e.g. `web/src/app/page.tsx`):**

```tsx
import Script from "next/script";
// ...inside the page JSX:
<div id="rso-chat" style={{ height: 600 }} />
<Script src="http://localhost:8787/chatbot/widget/rso-chat.js" strategy="afterInteractive" />
```

When the chatbot runs outside the repo, the script path is `http://localhost:8787/widget/rso-chat.js` (no `/chatbot`).

Because the page runs on a different port, allow it in `chatbot/.env`:

```
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

The widget brings its own styles (all prefixed `.rsoc-`), so it won't change the rest of the page.

## 3. Map ↔ chat events

Chat → map (in React, add these in a `useEffect` and remove them on cleanup):

```js
window.addEventListener('rso:rooms-recommended', (e) => {
  e.detail.room_ids;   // ['demo-gfs-102', ...] → highlight these
  e.detail.rooms;      // full room objects (rooms.json fields + popularity)
  e.detail.plan;       // forms, deadlines, permit info (optional)
});
window.addEventListener('rso:room-selected', (e) => {
  e.detail.room_id;    // user clicked a room card in the chat → focus it on the map
});
```

Map → chat:

```js
window.RSOChat?.ask('Tell me about room demo-gfs-101. Would it work for my event?');
```

`chatbot/demo.html` shows all of this working with a placeholder map.

## API

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/chat` | `{ "messages": [{ "role": "user" \| "assistant", "content": "..." }] }` | `{ reply, room_ids, rooms, plan }` |
| `GET /api/rooms` | | `{ rooms, warnings, updated_at, mode, live, source }` |
