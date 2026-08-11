"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/palace-data";
import PalaceRoomsModal from "@/components/PalaceRoomsModal";

type Word = {
  id: string;
  word: string;
  meaning: string | null;
  wordType: string | null;
  palaceRoom: string | null;
  palaceImagery: string | null;
  palaceMastery: number;
  ipa: string | null;
  usageNote: string | null;
  exampleSentence: string | null;
};

type Topic = { id: string; name: string; icon: string };

const MAX_MASTERY = 5;
const MASTERED_THRESHOLD = 3;

function isAssigned(word: Word) {
  return Boolean(word.palaceRoom && word.palaceImagery);
}

function sortByMastery(list: Word[]) {
  return [...list].sort((a, b) => a.palaceMastery - b.palaceMastery);
}

function masteryLabel(level: number) {
  if (level >= MAX_MASTERY) return "Thành thạo";
  if (level >= MASTERED_THRESHOLD) return "Đã thuộc";
  if (level > 0) return "Đang học";
  return "Mới";
}

const ROOM_TILE_BASE =
  "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-4 text-center transition-all";
const ROOM_TILE_ACTIVE =
  "border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none";

export default function PalaceWalkthrough({
  topic,
  userId,
  initialRooms,
  initialRoomStories,
  initialWords,
}: {
  topic: Topic;
  userId: string;
  initialRooms: Room[];
  initialRoomStories: Record<string, string>;
  initialWords: Word[];
}) {
  const [words, setWords] = useState(initialWords);
  const [rooms, setRooms] = useState(initialRooms);
  const [roomStories, setRoomStories] = useState(initialRoomStories);
  const [roomsModalOpen, setRoomsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [view, setView] = useState<"map" | "session">("map");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());

  const assignedWords = words.filter(isAssigned);
  const pendingCount = words.length - assignedWords.length;
  const correctSoFar = index - wrongIds.size;
  const sessionPercent = deck.length > 0 ? Math.round((correctSoFar / deck.length) * 100) : 0;
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  const roomStats = rooms.map((room) => {
    const roomWords = assignedWords.filter((w) => w.palaceRoom === room.id);
    const avgMastery =
      roomWords.length > 0
        ? roomWords.reduce((sum, w) => sum + w.palaceMastery, 0) / roomWords.length
        : 0;
    return { room, count: roomWords.length, avgMastery };
  });

  async function refetchWords() {
    const supabase = createClient();
    const { data: refreshed } = await supabase
      .from("vocabulary_entries")
      .select(
        "id, word, meaning, word_type, palace_room, palace_imagery, palace_mastery, ipa, usage_note, example_sentence",
      )
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: true });

    if (!refreshed) return null;

    const mapped = refreshed.map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      wordType: w.word_type,
      palaceRoom: w.palace_room,
      palaceImagery: w.palace_imagery,
      palaceMastery: w.palace_mastery,
      ipa: w.ipa,
      usageNote: w.usage_note,
      exampleSentence: w.example_sentence,
    }));
    setWords(mapped);
    return mapped;
  }

  async function refetchRoomStories() {
    const supabase = createClient();
    const { data } = await supabase
      .from("palace_room_stories")
      .select("room_id, story")
      .eq("topic_id", topic.id);
    if (data) {
      setRoomStories(Object.fromEntries(data.map((r) => [r.room_id, r.story])));
    }
  }

  async function handleWordsRefresh() {
    await Promise.all([refetchWords(), refetchRoomStories()]);
    exitToMap();
  }

  async function handleGeneratePalace() {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/palace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      await handleWordsRefresh();
    } catch {
      setGenerateError("Không thể kết nối tới server.");
    } finally {
      setGenerating(false);
    }
  }

  function beginDeck(list: Word[]) {
    setDeck(list);
    setIndex(0);
    setRevealed(false);
    setWrongIds(new Set());
  }

  function exitToMap() {
    setView("map");
    setActiveRoomId(null);
    setDeck([]);
    setIndex(0);
    setRevealed(false);
    setWrongIds(new Set());
  }

  function startFullSession() {
    if (assignedWords.length === 0) return;
    setActiveRoomId(null);
    beginDeck(sortByMastery(assignedWords));
    setView("session");
  }

  function startRoomSession(roomId: string) {
    const roomWords = assignedWords.filter((w) => w.palaceRoom === roomId);
    if (roomWords.length === 0) return;
    setActiveRoomId(roomId);
    beginDeck(sortByMastery(roomWords));
    setView("session");
  }

  function handleReveal() {
    setRevealed(true);
  }

  async function handleAnswer(correct: boolean) {
    const current = deck[index];
    const newMastery = correct
      ? Math.min(current.palaceMastery + 1, MAX_MASTERY)
      : Math.max(current.palaceMastery - 1, 0);

    setWords((prev) =>
      prev.map((w) => (w.id === current.id ? { ...w, palaceMastery: newMastery } : w)),
    );
    if (!correct) {
      setWrongIds((prev) => new Set(prev).add(current.id));
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("vocabulary_entries")
      .update({ palace_mastery: newMastery })
      .eq("id", current.id);
    if (error) {
      console.error("Failed to save palace mastery", error);
    }

    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function handleRestart() {
    const pool = activeRoomId
      ? assignedWords.filter((w) => w.palaceRoom === activeRoomId)
      : assignedWords;
    beginDeck(sortByMastery(pool));
  }

  function handleRetryWrong() {
    beginDeck(sortByMastery(assignedWords.filter((w) => wrongIds.has(w.id))));
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/vocabulary/${topic.id}`}
          className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          ← {topic.icon} {topic.name}
        </Link>
        {view === "session" && (
          <button
            type="button"
            onClick={exitToMap}
            className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            🗺️ Về sơ đồ nhà
          </button>
        )}
      </div>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-black">🏰 Cung điện trí nhớ</h1>
        {view === "map" && (
          <button
            type="button"
            onClick={() => setRoomsModalOpen(true)}
            className="rounded-full border-2 border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            ⚙️ Tuỳ chỉnh phòng
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-neutral-600">
        {view === "map"
          ? "Mỗi từ được gắn vào 1 phòng trong ngôi nhà trí nhớ, kèm 1 hình ảnh liên tưởng kỳ lạ, dễ nhớ. Bấm vào một phòng trên sơ đồ để ôn các từ trong phòng đó."
          : activeRoom
            ? `Đang ôn phòng: ${activeRoom.icon} ${activeRoom.name}`
            : "Đang ôn tất cả các phòng."}
      </p>

      {view === "session" && activeRoomId && roomStories[activeRoomId] && (
        <div className="mb-6 rounded-2xl border-2 border-black bg-amber-50 p-4 shadow-[4px_4px_0_0_#000]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            📖 Câu chuyện của phòng này
          </p>
          <p className="text-sm text-amber-900">{roomStories[activeRoomId]}</p>
        </div>
      )}

      {view === "session" && deck.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-600">
            <span>
              {correctSoFar}/{deck.length} từ đã nhớ
            </span>
            <span>{sessionPercent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-black bg-neutral-100">
            <div className="h-full bg-emerald-300" style={{ width: `${sessionPercent}%` }} />
          </div>
        </div>
      )}

      {view === "map" && pendingCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-black bg-amber-50 p-4 shadow-[4px_4px_0_0_#000]">
          <p className="text-sm text-amber-900">
            Có {pendingCount} từ chưa được đưa vào Cung điện trí nhớ.
          </p>
          <button
            type="button"
            onClick={handleGeneratePalace}
            disabled={generating}
            className="rounded-full border-2 border-black bg-emerald-300 px-3.5 py-2 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
          >
            {generating ? "Đang tạo..." : `🏰 Tạo Cung điện trí nhớ cho ${pendingCount} từ`}
          </button>
        </div>
      )}

      {generateError && (
        <p className="mb-6 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
          {generateError}
        </p>
      )}

      {assignedWords.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black bg-white p-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-emerald-100 text-2xl">
            🏰
          </span>
          <p className="mb-1 font-semibold text-black">Chưa có phòng nào trong cung điện</p>
          <p className="text-sm text-neutral-500">
            Bấm nút phía trên để tạo Cung điện trí nhớ từ các từ trong chủ đề này.
          </p>
        </div>
      ) : view === "map" ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={startFullSession}
            className="self-start rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            🔀 Ôn tất cả các phòng ({assignedWords.length} từ)
          </button>

          <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {roomStats.map(({ room, count, avgMastery }) => {
                const tint =
                  count === 0
                    ? "border-dashed border-neutral-300 bg-neutral-50 opacity-60 cursor-not-allowed"
                    : avgMastery >= MASTERED_THRESHOLD
                      ? `${ROOM_TILE_ACTIVE} bg-emerald-50`
                      : avgMastery > 0
                        ? `${ROOM_TILE_ACTIVE} bg-amber-50`
                        : `${ROOM_TILE_ACTIVE} bg-white`;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => startRoomSession(room.id)}
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
      ) : index >= deck.length ? (
        <div className="rounded-2xl border-2 border-black bg-emerald-50 p-6 text-center shadow-[5px_5px_0_0_#000]">
          <p className="text-lg font-semibold text-emerald-800">
            🎉 Bạn đã đi hết {deck.length} phòng — đúng {correctSoFar}, sai {wrongIds.size}!
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {wrongIds.size > 0 && (
              <button
                type="button"
                onClick={handleRetryWrong}
                className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
              >
                🔁 Ôn lại {wrongIds.size} từ chưa nhớ
              </button>
            )}
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              Đi lại từ đầu
            </button>
            <button
              type="button"
              onClick={exitToMap}
              className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              🗺️ Về sơ đồ nhà
            </button>
          </div>
        </div>
      ) : (
        (() => {
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
                  onClick={handleReveal}
                  className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                >
                  👁️ Từ này là gì?
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border-2 border-black bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <p>
                      <span className="font-semibold text-black">{current.word}</span>
                      {current.wordType && (
                        <span className="ml-1.5 rounded-full border border-emerald-700 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {current.wordType}
                        </span>
                      )}
                      {current.ipa && <span className="ml-1.5 text-emerald-800">/{current.ipa}/</span>}
                      {current.meaning && <> — {current.meaning}</>}
                    </p>
                    {current.usageNote && (
                      <p className="mt-1.5 text-xs text-emerald-800">📝 {current.usageNote}</p>
                    )}
                    {current.exampleSentence && (
                      <p className="mt-1 text-xs italic text-emerald-800">
                        💬 {current.exampleSentence}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">Bạn có nhớ ra từ này không?</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleAnswer(false)}
                      className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                    >
                      ❌ Chưa nhớ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswer(true)}
                      className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                    >
                      ✅ Nhớ rồi
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      <PalaceRoomsModal
        open={roomsModalOpen}
        onClose={() => setRoomsModalOpen(false)}
        userId={userId}
        rooms={rooms}
        onRoomsChanged={setRooms}
        onWordsAffected={handleWordsRefresh}
      />
    </>
  );
}
