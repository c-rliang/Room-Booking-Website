# RSO Room Helper: chatbot

Students describe their event in plain English. The chatbot asks for anything missing, then returns the forms, permits, deadlines and recommended rooms. Rooms come from the heatmap's `data/rooms.json`.

**Design rule:** the AI (Gemini by default, or Claude) only reads the conversation and writes the answer. Deadlines, permit triggers and room rankings come from tested JavaScript in `src/rules.js` and `src/rooms.js`.

## Run

Requires Node 18+. No npm packages.

```bash
cd chatbot
cp .env.example .env      # paste your free Gemini key from https://aistudio.google.com/apikey
npm test                  # 34 tests, no key needed
npm start                 # http://localhost:8787
```

- Rooms sync live from Amitesh's `web/src/data/rooms.json` on GitHub every 90 seconds (outside the repo, by default). Inside the repo it reads the local file; `git pull` updates it.
- Until the first sync, or if GitHub is unreachable, it uses the last synced copy or `data/rooms.sample.json`.
- `DEMO_TODAY=2026-10-01` fixes "today" so the Halloween example has valid deadlines.

See **INTEGRATION.md** for the team contract: data fields, embed code, events.

## Files

| Path | What it is |
| --- | --- |
| `widget/rso-chat.js` | Drop-in chat widget (the only file the website loads) |
| `server.js` | Serves the site + `/api/chat` + `/api/rooms` |
| `src/rules.js` | Classroom rules engine (deadlines, Week 4, blackout dates, start times, permits) |
| `src/rooms.js` | Reads `rooms.json`, adds popularity, recommends rooms |
| `src/tools.js` | Tools the AI can call: `plan_event`, `recommend_rooms`, `room_details` |
| `src/chat.js` | Tool-use loops for Gemini and Claude |
| `src/prompt.js` | System prompt |
| `data/term_calendar.json` | Official Fall 2026 / Spring 2027 dates from usc.edu (form reopen dates are sample) |
| `data/forms.json` | Real USC form links |
| `data/rooms.sample.json` | Fallback sample rooms in Amitesh's format |

## Rules

See **RULES.md** for every rule, its official source, and what is still unconfirmed.
