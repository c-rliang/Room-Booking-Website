"use client";

import { useState } from "react";
import RoomHeatmap, { type RoomFilters } from "@/components/RoomHeatmap";
import roomData from "@/data/rooms.json";

export default function Home() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomFilters>({
    minCapacity: 0,
    requiredEquipment: [],
  });

  return (
    <main className="min-h-screen bg-stone-100 p-4 text-stone-900 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <RoomHeatmap
          rooms={roomData.rooms}
          filters={filters}
          onFiltersChange={setFilters}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
        />
      </div>
    </main>
  );
}
