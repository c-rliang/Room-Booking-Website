"use client";

import { useState } from "react";

export type Room = {
  id: string;
  building_id: string;
  name: string;
  floor: number;
  capacity: number;
  equipment: string[];
  requests_last_30_days: number;
  image_url: string | null;
};

export type RoomFilters = {
  minCapacity: number;
  requiredEquipment: string[];
};

type RoomHeatmapProps = {
  rooms: Room[];
  filters: RoomFilters;
  onFiltersChange: (filters: RoomFilters) => void;
  selectedRoomId: string | null;
  recommendedRoomIds?: string[];
  onSelectRoom: (roomId: string | null) => void;
};

// Demo scale: 0 → white, 23 → yellow, 47 → orange, 70+ → red.
function demandColor(requests: number) {
  const stops = [
    [255, 255, 255], // White
    [255, 230, 0],   // Yellow
    [255, 140, 0],   // Orange
    [255, 0, 0],     // Red
  ];

  const value = Math.max(0, Math.min(requests / 70, 1)) * 3;
  const index = Math.min(Math.floor(value), 2);
  const blend = value - index;

  const rgb = stops[index].map((channel, i) =>
    Math.round(channel + (stops[index + 1][i] - channel) * blend)
  );

  return `rgb(${rgb.join(", ")})`;
}

// Project a simple floor layout into an isometric view.
function project(x: number, y: number, height = 0) {
  return [
    100 + x * 0.95 - y * 0.5,
    100 + x * 0.15 + y * 0.55 - height,
  ];
}

function polygon(points: number[][]) {
  return points.map((point) => point.join(",")).join(" ");
}

export default function RoomHeatmap({
  rooms,
  filters,
  onFiltersChange,
  selectedRoomId: selectedId,
  recommendedRoomIds = [],
  onSelectRoom: setSelectedId,
}: RoomHeatmapProps) {
  const floors = [...new Set(rooms.map((room) => room.floor))].sort(
    (a, b) => a - b
  );

  const [browsedFloor, setFloor] = useState(floors[0] ?? 1);

  // Selecting a room from the chatbot also reveals its floor.
  const floor =
    rooms.find((room) => room.id === selectedId)?.floor ?? browsedFloor;
  const visibleRooms = rooms.filter((room) => room.floor === floor);
  const selectedRoom = rooms.find((room) => room.id === selectedId);
  const equipmentOptions = [...new Set(rooms.flatMap((room) => room.equipment))].sort();
  const mismatchReasons = (room: Room): string[] => [
    ...(room.capacity < filters.minCapacity
      ? [`Seats ${room.capacity}; you need ${filters.minCapacity}.`]
      : []),
    ...filters.requiredEquipment
      .filter((item) => !room.equipment.includes(item))
      .map((item) => `Missing ${item}.`),
  ];
  const matchingRooms = visibleRooms.filter((room) => mismatchReasons(room).length === 0);
  const selectedReasons = selectedRoom ? mismatchReasons(selectedRoom) : [];
  const columns = Math.max(1, visibleRooms.length);
  const rows = 1;

  const floorCorners = [
    project(-30, -30, -8),
    project(columns * 180 - 10, -30, -8),
    project(columns * 180 - 10, rows * 150, -8),
    project(-30, rows * 150, -8),
  ];

  const xs = floorCorners.map(([x]) => x);
  const ys = floorCorners.map(([, y]) => y);
  const padding = 65;

  const viewBox = [
    Math.min(...xs) - padding,
    Math.min(...ys) - padding,
    Math.max(...xs) - Math.min(...xs) + padding * 2,
    Math.max(...ys) - Math.min(...ys) + padding * 2,
  ].join(" ");

  return (
    <div className="text-stone-900">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <h2 className="text-xl font-semibold">GFS room popularity</h2>
            <p className="mt-1 text-sm text-stone-500">
              Select a room to explore its features.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Choose floor
            </p>

            <div
              role="group"
              aria-label="Choose floor"
              className="inline-flex gap-1 rounded-xl bg-stone-100 p-1"
            >
              {floors.map((value) => {
                const roomCount = rooms.filter(
                  (room) => room.floor === value
                ).length;

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={floor === value}
                    onClick={() => {
                      setFloor(value);
                      setSelectedId(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-left transition-colors
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-red-800 ${floor === value
                        ? "bg-red-800 text-white shadow-sm"
                        : "text-stone-600 hover:bg-stone-200"
                      }`}
                  >
                    <span className="block text-sm font-semibold">
                      Floor {value}
                    </span>
                    <span className="block text-xs opacity-75">
                      {roomCount} rooms
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-b border-stone-200 bg-stone-50/70 p-5">
          <div className="flex flex-wrap items-end gap-5">
            <label className="block text-xs font-semibold text-stone-600">
              Minimum seats
              <input
                type="number"
                min="0"
                max="5000"
                value={filters.minCapacity || ""}
                placeholder="Any"
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  onFiltersChange({
                    ...filters,
                    minCapacity: Number.isFinite(value)
                      ? Math.max(0, Math.min(5000, Math.floor(value)))
                      : 0,
                  });
                }}
                className="mt-2 block w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-red-800"
              />
            </label>
            <fieldset className="min-w-0 flex-1">
              <legend className="text-xs font-semibold text-stone-600">Required equipment</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {equipmentOptions.map((item) => {
                  const active = filters.requiredEquipment.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onFiltersChange({
                        ...filters,
                        requiredEquipment: active
                          ? filters.requiredEquipment.filter((value) => value !== item)
                          : [...filters.requiredEquipment, item],
                      })}
                      className={`rounded-full border px-3 py-2 text-sm capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 ${active ? "border-red-800 bg-red-800 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-red-800"
                        }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button
              type="button"
              onClick={() => onFiltersChange({ minCapacity: 0, requiredEquipment: [] })}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800"
            >
              Reset filters
            </button>
          </div>
          <p role="status" className="mt-3 text-xs text-stone-600">
            {matchingRooms.length} of {visibleRooms.length} rooms match on Floor {floor}.
            {matchingRooms.length === 0
              ? " Try another floor or relax your filters."
              : " Faded rooms do not match; select one to see why."}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 pt-5 text-xs text-stone-600">
          <span>Less requested</span>
          <div
            aria-hidden="true"
            className="h-3 w-32 rounded-full border border-stone-200"
            style={{
              background:
                "linear-gradient(to right, #ffffff 0%, #ffe600 33.33%, #ff8c00 66.67%, #ff0000 100%)",
            }}
          />
          <span>More requested</span>
        </div>

        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="block h-[260px] w-full sm:h-[340px]"
          role="group"
          aria-label={`Simplified room layout for floor ${floor}`}
        >
          {/* Decorative floor slab */}
          <polygon
            points={polygon(floorCorners)}
            fill="#f5f5f4"
            stroke="#d6d3d1"
            strokeWidth="2"
          />

          {visibleRooms.map((room, index) => {
            const x = index * 180;
            const y = 0;
            const width = 140;
            const depth = 110;
            const height = 24;

            const a = project(x, y, height);
            const b = project(x + width, y, height);
            const c = project(x + width, y + depth, height);
            const d = project(x, y + depth, height);

            const bottomB = project(x + width, y);
            const bottomC = project(x + width, y + depth);
            const bottomD = project(x, y + depth);

            const center = project(
              x + width / 2,
              y + depth / 2,
              height
            );

            const selected = selectedId === room.id;
            const reasons = mismatchReasons(room);
            const matches = reasons.length === 0;
            const recommended = recommendedRoomIds.includes(room.id);
            const color = demandColor(room.requests_last_30_days);
            const label = room.name.match(/\d+[A-Za-z]?$/)?.[0] ?? room.name;

            return (
              <g
                key={room.id}
                role="button"
                tabIndex={0}
                aria-label={`${room.name}, capacity ${room.capacity}, ${room.requests_last_30_days} simulated requests`}
                aria-pressed={selected}
                opacity={matches ? 1 : 0.28}
                onClick={() => setSelectedId(room.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(room.id);
                  }
                }}
                className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <title>{room.name}{reasons.length > 0 ? ` — ${reasons.join(" ")}` : " — matches your filters"}</title>

                {/* Room side walls */}
                <polygon
                  points={polygon([b, c, bottomC, bottomB])}
                  fill={color}
                  stroke="#a8a29e"
                />
                <polygon
                  points={polygon([b, c, bottomC, bottomB])}
                  fill="black"
                  fillOpacity="0.16"
                  pointerEvents="none"
                />

                <polygon
                  points={polygon([d, c, bottomC, bottomD])}
                  fill={color}
                  stroke="#a8a29e"
                />
                <polygon
                  points={polygon([d, c, bottomC, bottomD])}
                  fill="black"
                  fillOpacity="0.07"
                  pointerEvents="none"
                />

                {/* Room top */}
                <polygon
                  points={polygon([a, b, c, d])}
                  fill={color}
                  stroke={selected ? "#292524" : recommended ? "#d99a00" : "#a8a29e"}
                  strokeWidth={selected || recommended ? 5 : 1.5}
                  strokeLinejoin="round"
                />

                <text
                  x={center[0]}
                  y={center[1] - 3}
                  textAnchor="middle"
                  fontSize="21"
                  fontWeight="700"
                  fill="#292524"
                  pointerEvents="none"
                >
                  {label}
                </text>
                <text
                  x={center[0]}
                  y={center[1] + 17}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#292524"
                  pointerEvents="none"
                >
                  {room.capacity} seats
                </text>
              </g>
            );
          })}
        </svg>

        <div
          aria-live="polite"
          className="border-t border-stone-200 bg-stone-50 p-5"
        >
          {selectedRoom ? (
            <>
              <div className="grid gap-5 md:grid-cols-[1.1fr_1fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Selected room</p>
                  <h3 className="mt-1 text-lg font-semibold">{selectedRoom.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
                    <span className="rounded-md border border-stone-200 bg-white px-2 py-1">Floor {selectedRoom.floor}</span>
                    <span className="rounded-md border border-stone-200 bg-white px-2 py-1">{selectedRoom.capacity} seats</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFloor(selectedRoom.floor);
                      setSelectedId(null);
                    }}
                    className="mt-3 rounded text-xs font-medium text-red-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-red-800"
                  >
                    Clear selection
                  </button>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Equipment</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {selectedRoom.equipment.map((item) => (
                      <li key={item} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs capitalize">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {selectedRoom.equipment.length === 0 && <p className="mt-2 text-sm text-stone-500">Not listed.</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Simulated demand</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedRoom.requests_last_30_days}<span className="ml-2 text-xs font-normal text-stone-500">requests / 30 days</span></p>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
                    role="img"
                    aria-label={`${selectedRoom.requests_last_30_days} simulated requests, on a scale from 0 to 70 or more`}
                  >
                    <div
                      className="h-full rounded-full border border-stone-300"
                      style={{
                        width: `${Math.max(2, Math.min(100, selectedRoom.requests_last_30_days / 70 * 100))}%`,
                        backgroundColor: demandColor(selectedRoom.requests_last_30_days),
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Historical demo count, not live availability.</p>
                </div>
              </div>
              {selectedReasons.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Does not match your filters: {selectedReasons.join(" ")}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-stone-700">Explore Floor {floor}</p>
              <p className="text-sm text-stone-500">Select a room to compare seats, equipment, and demand.</p>
            </div>
          )}
        </div>
      </section>

      <p className="mt-4 text-xs text-stone-500">
        Illustrative layout and simulated demand. Room colors do not
        represent live availability. Gold outlines indicate recommendations;
        a dark outline indicates selection.
      </p>
    </div>
  );
}