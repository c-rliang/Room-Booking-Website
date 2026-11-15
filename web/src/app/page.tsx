"use client";

import { useState } from "react";
import roomData from "@/data/rooms.json";

const rooms = roomData.rooms;
const floors = [...new Set(rooms.map((room) => room.floor))].sort(
  (a, b) => a - b
);

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

export default function Home() {
  const [floor, setFloor] = useState(floors[0] ?? 1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleRooms = rooms.filter((room) => room.floor === floor);
  const selectedRoom = rooms.find((room) => room.id === selectedId);
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
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <header className="bg-red-800 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold">RSO Room Explorer</h1>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
            Sample data · Prototype
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4 sm:p-8">
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
            className="block h-[400px] w-full sm:h-[460px]"
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
              const color = demandColor(room.requests_last_30_days);
              const label = room.name.match(/\d+[A-Za-z]?$/)?.[0] ?? room.name;

              return (
                <g
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${room.name}, capacity ${room.capacity}, ${room.requests_last_30_days} simulated requests`}
                  aria-pressed={selected}
                  onClick={() => setSelectedId(room.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(room.id);
                    }
                  }}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <title>{room.name}</title>

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
                    stroke={selected ? "#d99a00" : "#a8a29e"}
                    strokeWidth={selected ? 5 : 1.5}
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
            className="min-h-28 border-t border-stone-200 bg-stone-50 p-5"
          >
            {selectedRoom ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Selected room
                    </p>

                    <h3 className="mt-1 text-xl font-semibold">
                      {selectedRoom.name}
                    </h3>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-center">
                    <p className="text-xl font-bold">{selectedRoom.capacity}</p>
                    <p className="text-xs text-stone-500">seats</p>
                  </div>
                </div>

                <p className="mt-2 text-sm text-stone-500">
                  Floor {selectedRoom.floor}
                </p>

                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Equipment
                </p>

                <ul className="mt-2 flex flex-wrap gap-2">
                  {selectedRoom.equipment.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm capitalize"
                    >
                      {item}
                    </li>
                  ))}
                </ul>

                {selectedRoom.equipment.length === 0 && (
                  <p className="mt-2 text-sm text-stone-500">
                    Equipment not listed.
                  </p>
                )}

                <div className="mt-5 border-t border-stone-200 pt-4">
                  <p className="text-sm text-stone-600">
                    <span className="font-semibold text-stone-900">
                      {selectedRoom.requests_last_30_days}
                    </span>{" "}
                    simulated requests in the last 30 days
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                Select a numbered room to see its capacity and equipment.
              </p>
            )}
          </div>
        </section>

        <p className="mt-4 text-xs text-stone-500">
          Illustrative layout and simulated demand. Room colors do not
          represent live availability.
        </p>
      </div>
    </main>
  );
}