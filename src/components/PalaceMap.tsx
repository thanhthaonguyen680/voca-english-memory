"use client";

import { MASTERED_THRESHOLD, masteryLabel, type Room } from "@/lib/palace-data";

const ROOM_TILE_BASE =
  "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-4 text-center transition-all";
const ROOM_TILE_ACTIVE =
  "border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

type RoomStat = { room: Room; count: number; avgMastery: number };

export default function PalaceMap({
  assignedWordsCount,
  roomStats,
  onStartFull,
  onStartRoom,
}: {
  assignedWordsCount: number;
  roomStats: RoomStat[];
  onStartFull: () => void;
  onStartRoom: (roomId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onStartFull}
        className="self-start rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      >
        🔀 Ôn tất cả các phòng ({assignedWordsCount} từ)
      </button>

      <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {roomStats.map(({ room, count, avgMastery }) => {
            const tint =
              count === 0
                ? "border-dashed border-neutral-300 bg-neutral-50 opacity-60 cursor-not-allowed"
                : avgMastery >= MASTERED_THRESHOLD
                  ? `${ROOM_TILE_ACTIVE} bg-violet-50`
                  : avgMastery > 0
                    ? `${ROOM_TILE_ACTIVE} bg-amber-50`
                    : `${ROOM_TILE_ACTIVE} bg-white`;

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onStartRoom(room.id)}
                disabled={count === 0}
                className={`${ROOM_TILE_BASE} ${tint}`}
              >
                <span className="text-3xl">{room.icon}</span>
                <span className="text-sm font-semibold text-black">{room.name}</span>
                <span className="text-xs text-neutral-500">
                  {count === 0 ? "Chưa có từ" : `${count} từ · ${masteryLabel(avgMastery)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
