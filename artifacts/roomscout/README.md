# RoomScout

A frontend-only campus room finder and event planner (React + Vite, JavaScript, plain CSS).
All buildings, rooms, availability and policy text are **fictional demo data**, not official university rules.
Requests are stored in `localStorage` (key `roomscout.requests.v1`). No backend, auth or AI service.

## Run

```
pnpm install
pnpm --filter @workspace/roomscout run dev
```

(The Vite config expects `PORT` and `BASE_PATH` env vars, which Replit provides.)

## Replacing the mock heatmap

Edit `src/integrations/HeatmapAdapter.jsx`. Swap `<HeatmapPanel />` for your 3D heatmap. Props:

| prop | type |
| --- | --- |
| `rooms` | `Room[]` from `src/data/mockRooms.js` (`id, buildingId, name, capacity, projector, accessible, food, popularity 0-100, availability, amenities[]`) |
| `filters` | `{ minCapacity: number, projector: bool, accessible: bool, food: bool }` |
| `selectedRoomId` | `string \| null` |
| `highlightedRoomIds` | `string[]` (chatbot recommendations) |
| `onRoomSelect` | `(roomId: string) => void` — opens the room drawer |

## Replacing the simulated chatbot

Edit `getAssistantReply` in `src/integrations/ChatAdapter.jsx`.

```
getAssistantReply({ text, stage }) => Promise<{
  text, stage: 'idle' | 'awaiting-details' | 'planned',
  followUpOptions?: string[],
  plan?: { eventName, date: 'YYYY-MM-DD', time, attendance, food, projector },
  recommendedRoomIds?: string[],
  forms?: { name, detail, deadline }[],
  nextSteps?: string[],
}>
```

When a reply includes `recommendedRoomIds`, App highlights them on the map. Submitting calls
`onSubmitRequest(plan, roomId, formNames)` in `App.jsx`, which saves to localStorage.

## Structure

- `src/App.jsx` — shared state (selectedRoomId, highlightedRoomIds, filters, activePanel, chat, requests)
- `src/components/` — Header, ExploreRooms, HeatmapPanel, RoomFilters, RoomDetails, ChatPanel, RecommendationCard, MyRequests, RequestDetails, Toast
- `src/data/` — mockRooms.js, mockRequests.js
- `src/utils/storage.js` — localStorage helpers
