"use client";

import { useState } from "react";
import RoomHeatmap from "@/components/RoomHeatmap";
import roomData from "@/data/rooms.json";

export default function Home() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-stone-100 p-4 text-stone-900 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSelectedRoomId("demo-gfs-203")}
            className="rounded-lg bg-red-800 px-4 py-2 text-sm text-white"
          >
            Test: select room 203
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoomId(null)}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm"
          >
            Clear selection
          </button>
        </div>

        <RoomHeatmap
          rooms={roomData.rooms}
          selectedRoomId={selectedRoomId}
          recommendedRoomIds={["demo-gfs-104", "demo-gfs-203"]}
          onSelectRoom={setSelectedRoomId}
        />
      </div>
    </main>
  );
}
