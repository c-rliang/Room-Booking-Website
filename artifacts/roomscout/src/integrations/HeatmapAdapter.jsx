/*
 * HeatmapAdapter — the single place the map is plugged in.
 *
 * TEAMMATE: replace <HeatmapPanel /> below with the real 3D heatmap.
 * Keep the same props contract:
 *   rooms:              array of room objects (see src/data/mockRooms.js)
 *   filters:            { minCapacity: number, projector: bool, accessible: bool, food: bool }
 *   selectedRoomId:     string | null
 *   highlightedRoomIds: string[]  (chatbot recommendations)
 *   onRoomSelect:       (roomId: string) => void
 */
import HeatmapPanel from '../components/HeatmapPanel.jsx';

export const USE_MOCK_HEATMAP = true;

export default function HeatmapAdapter(props) {
  if (USE_MOCK_HEATMAP) return <HeatmapPanel {...props} />;
  // return <Real3DHeatmap {...props} />;
  return <HeatmapPanel {...props} />;
}
