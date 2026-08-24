import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type Room = { id: string; name: string; icon: string };

// The original fixed room list — kept as the seed data for every user's first visit, not as a
// shared global list anymore. Ids are stable strings (not random) so palace_room values
// written before customization existed keep resolving once a user's rows are seeded. The 8
// original whole-room ids (living-room, kitchen, bedroom, bathroom, garden, garage, staircase,
// balcony) are never renamed/removed for that reason — new stops are only ever inserted
// alongside them. Deliberately mixes whole rooms with specific objects inside them (fridge,
// wardrobe, TV, desk...) so a "loci" isn't limited to one stop per room — real Method of Loci
// journeys use every distinct piece of furniture along the walk, not just the room as a whole,
// which is also what roughly doubles how many words fit before the round-robin assignment in
// /api/palace/generate starts cycling back through the same stops.
// Ordered "outside in" (2026-08-24, per a request to walk the journey starting from the yard)
// — garden moved ahead of front-door so a brand-new user's default walk starts outside and
// moves into the house, matching how palace-journey.ts stitches per-room stories in this same
// room order. Only affects newly-seeded users; existing users keep their own stored
// sort_order and can drag-reorder in "⚙️ Tuỳ chỉnh phòng" if they want the same flow.
export const DEFAULT_ROOMS: Room[] = [
  { id: "garden", name: "Sân vườn", icon: "🌳" },
  { id: "front-door", name: "Cổng nhà", icon: "🚪" },
  { id: "living-room", name: "Phòng khách", icon: "🛋️" },
  { id: "tv", name: "Ti vi", icon: "📺" },
  { id: "bookshelf", name: "Kệ sách", icon: "📚" },
  { id: "kitchen", name: "Nhà bếp", icon: "🍳" },
  { id: "fridge", name: "Tủ lạnh", icon: "🧊" },
  { id: "dining-table", name: "Bàn ăn", icon: "🍽️" },
  { id: "bedroom", name: "Phòng ngủ", icon: "🛏️" },
  { id: "wardrobe", name: "Tủ quần áo", icon: "👔" },
  { id: "desk", name: "Bàn học", icon: "🪑" },
  { id: "bathroom", name: "Phòng tắm", icon: "🚿" },
  { id: "mirror", name: "Gương", icon: "🪞" },
  { id: "staircase", name: "Cầu thang", icon: "🪜" },
  { id: "balcony", name: "Ban công", icon: "🌇" },
  { id: "garage", name: "Gara", icon: "🚗" },
];

export const ROOM_ICONS = [
  "🛋️",
  "🍳",
  "🛏️",
  "🚿",
  "🌳",
  "🚗",
  "🪜",
  "🌇",
  "📚",
  "🎮",
  "🧺",
  "🪟",
  "🚪",
  "🛁",
  "🪑",
  "🖼️",
  "🧊",
  "👔",
  "📺",
  "🍽️",
  "🪞",
  "🫖",
  "🚰",
  "🗄️",
  "💡",
  "💻",
];

export type RoomSuggestion = { name: string; icon: string };

// Quick-add suggestions grouped by room category (2026-08-24) — lets a user split a broad room
// like "Phòng khách" into specific furniture-level stops (sofa, coffee table...) with one tap
// instead of typing each one by hand. Purely a UI convenience over the existing "add a custom
// room" flow (PalaceRoomsModal) — no new capability, no schema change; a suggestion is just a
// name+icon pair that gets inserted the exact same way a hand-typed room would.
export const ROOM_SUGGESTIONS: { category: string; items: RoomSuggestion[] }[] = [
  {
    category: "Phòng khách",
    items: [
      { name: "Ghế sofa", icon: "🛋️" },
      { name: "Bàn trà", icon: "🫖" },
      { name: "Kệ tivi", icon: "📺" },
      { name: "Kệ sách", icon: "📚" },
      { name: "Cửa sổ", icon: "🪟" },
    ],
  },
  {
    category: "Nhà bếp",
    items: [
      { name: "Bồn rửa bát", icon: "🚰" },
      { name: "Tủ bếp", icon: "🗄️" },
      { name: "Bếp nấu", icon: "🍳" },
      { name: "Bàn ăn", icon: "🍽️" },
      { name: "Tủ lạnh", icon: "🧊" },
    ],
  },
  {
    category: "Phòng ngủ",
    items: [
      { name: "Giường ngủ", icon: "🛏️" },
      { name: "Tủ quần áo", icon: "👔" },
      { name: "Bàn trang điểm", icon: "🪞" },
      { name: "Đèn ngủ", icon: "💡" },
    ],
  },
  {
    category: "Phòng tắm",
    items: [
      { name: "Bồn tắm", icon: "🛁" },
      { name: "Vòi sen", icon: "🚿" },
      { name: "Bồn rửa mặt", icon: "🚰" },
      { name: "Gương", icon: "🪞" },
    ],
  },
  {
    category: "Phòng làm việc",
    items: [
      { name: "Bàn làm việc", icon: "🪑" },
      { name: "Máy tính", icon: "💻" },
      { name: "Kệ sách", icon: "📚" },
    ],
  },
  {
    category: "Ngoài trời",
    items: [
      { name: "Cổng nhà", icon: "🚪" },
      { name: "Sân vườn", icon: "🌳" },
      { name: "Ban công", icon: "🌇" },
      { name: "Gara", icon: "🚗" },
      { name: "Cầu thang", icon: "🪜" },
    ],
  },
];

// Every user gets their own customizable room list, seeded lazily (on first generate call or
// first time the room manager is opened) rather than via a migration backfill — new users get
// rows created the first time they're needed instead of an empty table.
export async function ensureUserRooms(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Room[]> {
  const { data: existing } = await supabase
    .from("palace_rooms")
    .select("id, name, icon")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (existing && existing.length > 0) {
    return existing;
  }

  const seeded = DEFAULT_ROOMS.map((room, index) => ({
    id: room.id,
    user_id: userId,
    name: room.name,
    icon: room.icon,
    sort_order: index,
  }));

  const { error } = await supabase.from("palace_rooms").insert(seeded);
  if (error) {
    console.error("Failed to seed default palace rooms", error);
    return DEFAULT_ROOMS;
  }

  return DEFAULT_ROOMS;
}

export const MAX_MASTERY = 5;
export const MASTERED_THRESHOLD = 3;

export function masteryLabel(level: number) {
  if (level >= MAX_MASTERY) return "Thành thạo";
  if (level >= MASTERED_THRESHOLD) return "Đã thuộc";
  if (level > 0) return "Đang học";
  return "Mới";
}
