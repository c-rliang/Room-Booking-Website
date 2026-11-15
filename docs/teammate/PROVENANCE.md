# Teammate integration provenance

Repository: https://github.com/c-rliang/Room-Booking-Website

Fetched both named branches before importing, rather than trusting the stale local tracking branch. Fetched tips matched the planned revisions:

| Feature | Branch | Imported commit |
| --- | --- | --- |
| Chatbot | `chatbot` | `0e60686f99561cffbfc7c277f5099c471fb97ee0` |
| Map/catalog | `feature/room-heatmap` | `bf4fc35302137ee42d05e269c6a2210d89d26cdb` |

## Selective import, not an application merge

- Chatbot `src`, `data/forms.json`, `data/term_calendar.json`, tests and test-only sample catalog imported under `artifacts/api-server/src/chatbot/`.
- `RULES.md` and `INTEGRATION.md` retained here as **upstream reference documents**, not current runtime/setup instructions. Their standalone server, private `.env`, GitHub polling and widget instructions do not apply to this workspace.
- `web/src/components/RoomHeatmap.tsx` ported into RoomScout's `integrations/RoomHeatmap.jsx` with the same geometry, controls, filtering, keyboard behavior and selection/highlight semantics, scoped plain CSS instead of Tailwind. Duplicate filters/details removed in favor of the site's existing controls.
- `web/src/data/rooms.json` imported unchanged into `lib/room-catalog/rooms.json`. Sample identities remain exactly as supplied. No food, accessibility or date availability claims were invented.
- No teammate Next.js app, root package/config, standalone server, widget, lockfile, or private environment file was imported.

## Integration corrections

- Provider/tool loops, prompt and deterministic policy calculations retained. Planning input capture added so the UI uses provided event details instead of inventing them.
- Config reads only server environment; original provider/model settings/defaults supported. Local JSON imports bundle data into the existing API build safely.
- Catalog normalization and scale extracted to one shared package; room recommendation ranking retained. Runtime GitHub polling, stale-file fallback and configurable demand-scale drift intentionally removed.
- Old file-reload/GitHub ETag tests replaced with shared local-catalog/ID/no-match contract tests because runtime remote synchronization is out of scope. Deterministic teammate rules tests and both provider tool-loop tests retained. Standalone server test replaced by existing Express API integration tests.
- Added bounded payload/history, stricter tool input checks, total provider timeout/abort, bounded rate limits, cross-origin rejection and generic errors/logs. Provider internals do not reach clients.
- Old fictional rooms retained only for saved-request lookup. Local storage key unchanged. New records include snapshots, and unreadable storage cannot be silently overwritten.

## Updating from teammates

1. Start with a clean working tree or preserve local work. Fetch explicitly:
   `git fetch origin chatbot feature/room-heatmap`
2. Compare the fetched commits to the revisions above using `git diff <old-commit> origin/<branch> -- <source-paths>`. Inspect only public source/config examples; never read or import private `.env` files.
3. Apply changes selectively to the mapped destinations above. Do **not** merge upstream root configuration or check out the Next.js app over RoomScout.
4. Map-team catalog owns IDs, floors, equipment, counts and synthetic metadata. Any renamed/removed ID requires compatibility handling; never assign an old saved ID to a different room. Do not mix test-only `rooms.sample.json` into active recommendations.
5. Review policy-source/calendar changes with teammates. Preserve caveats, links, blocker behavior and existing rules; do not turn assumptions into verified policies.
6. Update OpenAPI first for contract changes, regenerate clients/validators, then update adapters and deterministic tests together.
7. Run `pnpm test`, `pnpm run typecheck`, both artifact builds and one focused browser flow for affected behavior. Mock providers in tests; perform a real turn only when a key has been supplied through Secrets.
8. Record the new source revisions and integration deviations here. No protected-branch push, PR merge or production deployment is implied.

## Verified during integration

- Automated suite: 45 passing tests at first full verification, including the teammate logic plus integration contracts.
- Workspace typecheck and both artifact builds passed.
- Running proxy: health 200, shared synthetic catalog 200, unconfigured chat 503 with recoverable setup instructions.
- Desktop screenshot confirmed the existing two-panel app, synthetic demand legend and isometric floor map.
- One desktop/mobile browser pass passed: real missing-key recovery; mocked two-turn chat with exact ordered history; official form links and deadline guidance; recommendation selection revealing Floor 2; room details/selection; one local save; My Requests and reload retaining the exact room ID; original legacy identities; floor/capacity/equipment filtering; keyboard activation; no-match reply without a save action.
- Mobile checked at 390×844 with no document horizontal overflow; navigation, details, map and chat fit. Desktop checked at 1280×800. Browser mocks affected only `/api/chat`, not catalog loading or local persistence. No app/workflow/environment changes were made by the tester.
- The browser driver's locator clicks intermittently failed; coordinate clicks succeeded and each result was verified. Local storage was checked to rule out duplicate saves. This was a test-driver limitation, not a detected application failure.
- **Credential-blocked:** user dismissed the Gemini secret request. No real Gemini/Anthropic turn was attempted or claimed.
