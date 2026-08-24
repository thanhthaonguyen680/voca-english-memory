"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ROOM_ICONS, ROOM_SUGGESTIONS, type Room, type RoomSuggestion } from "@/lib/palace-data";

export default function PalaceRoomsModal({
  open,
  onClose,
  userId,
  rooms,
  onRoomsChanged,
  onWordsAffected,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  rooms: Room[];
  onRoomsChanged: (rooms: Room[]) => void;
  onWordsAffected: () => void;
}) {
  const [icon, setIcon] = useState(ROOM_ICONS[0]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!open) return null;

  async function persistOrder(next: Room[]) {
    const supabase = createClient();
    await Promise.all(
      next.map((room, index) =>
        supabase.from("palace_rooms").update({ sort_order: index }).eq("id", room.id),
      ),
    );
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...rooms];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    onRoomsChanged(next);
    persistOrder(next);
  }

  async function insertRoom(roomName: string, roomIcon: string) {
    const supabase = createClient();
    const id = crypto.randomUUID();
    const { error: insertError } = await supabase.from("palace_rooms").insert({
      id,
      user_id: userId,
      name: roomName,
      icon: roomIcon,
      sort_order: rooms.length,
    });

    if (insertError) {
      setError("Không thể thêm phòng.");
      return false;
    }

    onRoomsChanged([...rooms, { id, name: roomName, icon: roomIcon }]);
    return true;
  }

  async function handleAddRoom(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setAdding(true);
    setError("");
    try {
      const ok = await insertRoom(trimmed, icon);
      if (ok) setName("");
    } finally {
      setAdding(false);
    }
  }

  async function handleQuickAdd(item: RoomSuggestion) {
    setAddingSuggestion(item.name);
    setError("");
    try {
      await insertRoom(item.name, item.icon);
    } finally {
      setAddingSuggestion(null);
    }
  }

  async function handleRename(room: Room) {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === room.name) {
      setEditingId(null);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("palace_rooms")
      .update({ name: trimmed })
      .eq("id", room.id);

    if (updateError) {
      setError("Không thể đổi tên phòng.");
      return;
    }

    onRoomsChanged(rooms.map((r) => (r.id === room.id ? { ...r, name: trimmed } : r)));
    setEditingId(null);
  }

  async function handleChangeIcon(room: Room, newIcon: string) {
    setIconPickerId(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("palace_rooms")
      .update({ icon: newIcon })
      .eq("id", room.id);

    if (updateError) {
      setError("Không thể đổi icon.");
      return;
    }

    onRoomsChanged(rooms.map((r) => (r.id === room.id ? { ...r, icon: newIcon } : r)));
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      await supabase
        .from("vocabulary_entries")
        .update({ palace_room: null })
        .eq("palace_room", deleteTarget.id);

      const { error: deleteError } = await supabase
        .from("palace_rooms")
        .delete()
        .eq("id", deleteTarget.id);

      if (deleteError) {
        setError("Không thể xoá phòng.");
        return;
      }

      onRoomsChanged(rooms.filter((r) => r.id !== deleteTarget.id));
      onWordsAffected();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={onClose}
          className="fixed inset-0 cursor-default bg-black/50"
        />
        <div className="relative flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-black">Tuỳ chỉnh phòng</h2>
              <p className="text-xs text-neutral-500">Kéo ⠿ để sắp xếp lại thứ tự</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-100"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(index)}
                className="flex items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[2px_2px_0_0_#000]"
              >
                <span className="cursor-grab text-neutral-400" title="Kéo để sắp xếp">
                  ⠿
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIconPickerId(iconPickerId === room.id ? null : room.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-white text-lg"
                  >
                    {room.icon}
                  </button>
                  {iconPickerId === room.id && (
                    <div className="absolute left-0 top-10 z-10 grid grid-cols-4 gap-1 rounded-xl border-2 border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
                      {ROOM_ICONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleChangeIcon(room, item)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-base hover:bg-neutral-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {editingId === room.id ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleRename(room);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-md border-2 border-black bg-white px-2 py-1 text-sm text-black outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(room)}
                      className="rounded-md border-2 border-black bg-violet-300 px-2 py-1 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(room.id);
                      setDraftName(room.name);
                    }}
                    className="flex-1 text-left text-sm font-medium text-black hover:text-violet-700"
                  >
                    {room.name}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDeleteTarget(room)}
                  disabled={rooms.length <= 1}
                  title={rooms.length <= 1 ? "Phải có ít nhất 1 phòng" : "Xoá phòng"}
                  className="text-neutral-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t-2 border-black pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              💡 Gợi ý theo phòng (bấm để thêm nhanh)
            </p>
            <div className="flex max-h-40 flex-col gap-2.5 overflow-y-auto">
              {ROOM_SUGGESTIONS.map((group) => (
                <div key={group.category}>
                  <p className="mb-1 text-xs font-semibold text-neutral-400">{group.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => {
                      const alreadyAdded = rooms.some(
                        (r) => r.name.trim().toLowerCase() === item.name.toLowerCase(),
                      );
                      return (
                        <button
                          key={item.name}
                          type="button"
                          disabled={alreadyAdded || addingSuggestion === item.name}
                          onClick={() => handleQuickAdd(item)}
                          className={
                            alreadyAdded
                              ? "inline-flex cursor-not-allowed items-center gap-1 rounded-full border-2 border-black bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-400"
                              : "inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-2.5 py-1 text-xs font-medium text-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                          }
                        >
                          <span aria-hidden>{item.icon}</span> {item.name}
                          {alreadyAdded && <span aria-hidden>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddRoom} className="flex flex-col gap-3 border-t-2 border-black pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Thêm phòng mới
            </p>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIconPickerId(iconPickerId === "new" ? null : "new")}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black bg-white text-lg"
                >
                  {icon}
                </button>
                {iconPickerId === "new" && (
                  <div className="absolute left-0 top-12 z-10 grid grid-cols-4 gap-1 rounded-xl border-2 border-black bg-white p-2 shadow-[3px_3px_0_0_#000]">
                    {ROOM_ICONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setIcon(item);
                          setIconPickerId(null);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-base hover:bg-neutral-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Phòng làm việc"
                className="flex-1 rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !name.trim()}
              className="rounded-full border-2 border-black bg-violet-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              {adding ? "Đang thêm..." : "+ Thêm phòng"}
            </button>
          </form>

          {error && (
            <p className="rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Xong
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Xoá phòng "${deleteTarget?.name}"?`}
        description="Các từ đang ở phòng này sẽ được xếp vào phòng khác ở lần tạo Cung điện trí nhớ tiếp theo."
        confirmLabel="Xoá"
        danger
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
