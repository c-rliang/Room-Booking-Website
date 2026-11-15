# RoomScout

Campus room explorer and event-planning assistant. Rooms and request-demand counts are synthetic. Saved requests are browser-local demo records, never official bookings.

## Run and verify

- RoomScout: managed workflow `artifacts/roomscout: web`
- API: managed workflow `artifacts/api-server: API Server`
- `pnpm test` — teammate deterministic rules/provider tests and integration contracts (mocked providers, no credentials)
- `pnpm run typecheck` — workspace TypeScript checks (RoomScout application stays JavaScript)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate clients and validation after changing the OpenAPI spec
- RoomScout build needs workflow-provided `PORT` and `BASE_PATH`; API build: `pnpm --filter @workspace/api-server run build`

## Scope and standing constraints

- Keep RoomScout in React **JavaScript and plain CSS**. Do not replace it with the teammates' Next.js app or migrate it to TypeScript/Tailwind.
- **Approved exception:** the teammate chatbot may use live AI through the existing API Server. The former no-backend/no-live-AI restriction is superseded for this integration only.
- No authentication, database, real reservations, official form submission, or production deployment is part of this work. The template's unused database package does not mean RoomScout uses a database.
- Explore Rooms stays visible when switching between Plan Event and My Requests.
- Requests remain in `roomscout.requests.v1` localStorage. Never remap old room IDs to new IDs. Preserve legacy lookup/snapshots without including old rooms in new recommendations.
- Keep map and chat adapters replaceable. Retain teammate policy rules, source links and caveats. Do not claim synthetic rooms are verified USC rooms, demand is availability, or requests were sent.

## Integration pointers

- `docs/teammate/PROVENANCE.md` — sources, exact revisions, import/update procedure, intentional integration corrections and verification
- `artifacts/roomscout/README.md` — provider setup and integration contracts
- `lib/room-catalog/rooms.json` — teammate-owned GFS sample catalog; `index.js` owns normalization and popularity scale
- `lib/api-spec/openapi.yaml` — API contract
- `artifacts/api-server/src/chatbot/` — server-only imported chatbot engine and tests; JSON data bundled into the API, no runtime filesystem paths or GitHub polling

## Credentials and operation

Use workspace Secrets for `GEMINI_API_KEY` (default) or `ANTHROPIC_API_KEY`. Never expose keys through frontend environment variables, source, logs or chat. Original teammate options `LLM_PROVIDER`, `GEMINI_MODEL`, `ANTHROPIC_MODEL` remain server-side; no provider picker. See the README for model defaults and aliases.

No key is required to browse rooms or read local requests. Missing credentials produce a recoverable chat setup message. Requests use the shared same-origin `/api` routing, never hard-coded localhost URLs or a second chatbot server.
