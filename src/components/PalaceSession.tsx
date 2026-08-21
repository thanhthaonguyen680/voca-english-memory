"use client";

import { masteryLabel, type Room } from "@/lib/palace-data";
import type { Word } from "@/components/PalaceWalkthrough";

export default function PalaceSession({
  deck,
  index,
  revealed,
  wrongIds,
  rooms,
  correctSoFar,
  onReveal,
  onAnswer,
  onRetryWrong,
  onRestart,
  onExitToMap,
}: {
  deck: Word[];
  index: number;
  revealed: boolean;
  wrongIds: Set<string>;
  rooms: Room[];
  correctSoFar: number;
  onReveal: () => void;
  onAnswer: (correct: boolean) => void;
  onRetryWrong: () => void;
  onRestart: () => void;
  onExitToMap: () => void;
}) {
  if (index >= deck.length) {
    return (
      <div className="rounded-2xl border-2 border-black bg-violet-50 p-6 text-center shadow-[5px_5px_0_0_#000]">
        <p className="text-lg font-semibold text-violet-800">
          🎉 Bạn đã đi hết {deck.length} phòng — đúng {correctSoFar}, sai {wrongIds.size}!
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {wrongIds.size > 0 && (
            <button
              type="button"
              onClick={onRetryWrong}
              className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              🔁 Ôn lại {wrongIds.size} từ chưa nhớ
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Đi lại từ đầu
          </button>
          <button
            type="button"
            onClick={onExitToMap}
            className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            🗺️ Về sơ đồ nhà
          </button>
        </div>
      </div>
    );
  }

  const current = deck[index];
  const room = rooms.find((r) => r.id === current.palaceRoom);

  return (
    <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_0_#000]">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <span>
          {room?.icon} {room?.name ?? "Phòng"}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 font-semibold text-neutral-600">
            {masteryLabel(current.palaceMastery)}
          </span>
          <span>
            {index + 1}/{deck.length}
          </span>
        </div>
      </div>

      <p className="mb-1 text-xs font-medium text-neutral-400">Hình ảnh liên tưởng</p>
      <p className="mb-6 text-lg font-semibold text-black">{current.palaceImagery}</p>

      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          👁️ Từ này là gì?
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border-2 border-black bg-violet-50 px-3 py-2 text-sm text-violet-900">
            <p>
              <span className="font-semibold text-black">{current.word}</span>
              {current.wordType && (
                <span className="ml-1.5 rounded-full border border-violet-700 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                  {current.wordType}
                </span>
              )}
              {current.ipa && <span className="ml-1.5 text-violet-800">/{current.ipa}/</span>}
              {current.meaning && <> — {current.meaning}</>}
            </p>
            {current.usageNote && (
              <p className="mt-1.5 text-xs text-violet-800">📝 {current.usageNote}</p>
            )}
            {current.exampleSentence && (
              <p className="mt-1 text-xs italic text-violet-800">💬 {current.exampleSentence}</p>
            )}
          </div>
          <p className="text-xs text-neutral-500">Bạn có nhớ ra từ này không?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onAnswer(false)}
              className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              ❌ Chưa nhớ
            </button>
            <button
              type="button"
              onClick={() => onAnswer(true)}
              className="rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              ✅ Nhớ rồi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
