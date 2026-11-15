# RoomScout

Existing React + Vite **JavaScript / plain CSS** site, now integrating the team's isometric room map and server-side event-planning chatbot. Explore Rooms stays mounted alongside both Plan Event and My Requests.

**Not a reservation system.** All eight GFS room identities, capacities, equipment and request counts are invented sample data, not verified USC room information or live availability. Local requests are not sent to a university or official form. Policy guidance comes from the teammate's sourced rules and must be confirmed with Campus Activities.

## Run

Install with `pnpm install`, then start the existing RoomScout and API Server managed workflows. They inject `PORT` / `BASE_PATH` and share the proxy. Do not start `chatbot/server.js`, add a Vite API proxy or put provider credentials in the browser.

### Live provider setup

Add **`GEMINI_API_KEY`** through workspace Secrets and restart the API Server. No key was supplied during integration, so an actual live-provider turn has **not** been verified; provider calls were mocked in automated/browser checks. Missing configuration does not prevent map or saved-request usage.

Server-only options (no provider-selection UI):

| Setting | Default |
| --- | --- |
| `LLM_PROVIDER` | `gemini`; existing `anthropic` support retained |
| `GEMINI_MODEL` | `gemini-3.5-flash` (teammate default) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` (teammate default) |
| `ANTHROPIC_API_KEY` | Secret required only when Anthropic is selected |

`CHAT_PROVIDER` / `CHAT_MODEL` are accepted aliases; original provider-specific settings win. Never use `VITE_*` credentials, commit `.env` files or import teammates' private environment files. Models can be overridden on the API process if the provider account requires another supported model.

## Shared catalog and demand contract

`lib/room-catalog/rooms.json` is the **single active sample source**, owned by the map team. Both API tools and explorer use its stable `demo-gfs-*` IDs. The explorer loads `GET /api/rooms`; it never silently replaces unavailable data with another catalog. Food permission and accessibility are unknown, not filterable invented attributes.

Room fields: `id, building_id, name, floor, capacity, equipment[], requests_last_30_days, image_url, popularity, popularity_label`. Catalog includes `synthetic: true`, description and `popularity_full: 70`.

- Raw demand: requests in 30 days, **not availability**.
- Normalized popularity: rounded `min(requests / 70, 1)` on **0–1**, consistently used by chat and details.
- Color interpolation: 0 white → ~23 yellow → ~47 orange → 70+ red.
- Labels: Low <0.4, Medium <0.7, High ≥0.7.
- All equipment filters are derived from the catalog. A selected recommendation reveals its floor and clears conflicting explorer filters.

## API / adapters

OpenAPI lives in `lib/api-spec/openapi.yaml`; run `pnpm --filter @workspace/api-spec run codegen` after changes. Frontend uses generated `getRooms` / `sendChat` clients and API uses generated validation.

- `GET /api/healthz` — retained health endpoint
- `GET /api/rooms` — synthetic normalized catalog, or safe 503
- `POST /api/chat` — `{messages:[{role:"user"|"assistant", content:string}]}`; returns `{reply, plan, rooms, event}`. `plan` and `rooms` are actual captured tool outputs or null. `event` is the checked planning input or null, avoiding guessed names/headcounts in local records.
- Safe errors: `{code,error}` with 400 invalid input/JSON, 413 too large, 429 rate limited (`Retry-After: 60`), 502 provider/output failure, 503 configuration/catalog unavailable, 504 total deadline exceeded.

History must alternate, begin/end with user, max 30 messages and 2,000 characters/message; JSON max 64KB. UI sends the full conversation until the explicit limit, supports retry without duplicate messages, aborts reset conversations, and ignores stale responses.

One 25-second deadline spans every provider/tool round and parsing; provider fetch is aborted on expiry. Limits are bounded in-process buckets: 12 attempts/client/minute, 60 globally/minute, at most 1,000 buckets. Untrusted forwarding headers are not used as identities, so clients behind a proxy may conservatively share the per-client bucket. No claims of distributed limits across processes.

Logs include request method/path/status and safe error codes, not prompts, replies, provider exception messages or keys. API has no static file server and no CORS allowance; browser calls must be same-origin. JSON assets are bundled, not resolved relative to compiled module URLs.

`HeatmapAdapter.jsx` receives `{rooms, filters:{minCapacity,requiredEquipment}, selectedRoomId, highlightedRoomIds, onRoomSelect}`. It adapts the teammate geometry to scoped plain CSS. Parent owns filters/details; floor controls and keyboard selection remain in the map.

`ChatAdapter.jsx` sends live history and `chat-model.js` maps actual responses to the existing UI. Partial plans, no matches, food blockers, form preparation lists, deadline warnings, source links and copy-ready answers are preserved. An incomplete/blocked plan cannot create a request.

## Local request compatibility

`roomscout.requests.v1` is unchanged. The original fictional catalog remains lookup-only in `legacyRooms.js`; no legacy room enters new recommendations. New records capture a room snapshot with exact ID. Unknown saved IDs display explicitly instead of being mapped to a different room.

Corrupt/unreadable storage is reported and never overwritten by a new request. Existing demo status labels remain supported, visibly marked demo. No database, account or official submission was added.

## Verification

`pnpm test` runs teammate rules, Gemini/Anthropic fake-provider tool loops, normalization and shared IDs, request/response validation, history, timeouts/failures, rate limits, partial plans, no-match mapping, source-link safety and legacy/local storage compatibility.

See `docs/teammate/PROVENANCE.md` for source revisions, update procedure and browser-check results.
