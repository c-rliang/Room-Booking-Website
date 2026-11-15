/*
 * HeatmapAdapter: the single place the map is plugged in.
 * Props contract:
 *   rooms:              room objects (snake_case upstream fields + aliases)
 *   filters:            { minCapacity: number, requiredEquipment: string[] }
 *   selectedRoomId:     string | null
 *   highlightedRoomIds: string[]  (chatbot recommendations)
 *   onRoomSelect:       (roomId: string | null) => void
 */
import RoomHeatmap from './RoomHeatmap.jsx';

export default function HeatmapAdapter({
  rooms = [],
  filters = { minCapacity: 0, requiredEquipment: [] },
  selectedRoomId = null,
  highlightedRoomIds = [],
  onRoomSelect,
}) {
  return (
    <RoomHeatmap
      rooms={rooms}
      filters={filters}
      selectedRoomId={selectedRoomId}
      highlightedRoomIds={highlightedRoomIds || []}
      onRoomSelect={onRoomSelect || (() => {})}
    />
  );
}
