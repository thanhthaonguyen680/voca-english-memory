"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import OnboardingHint from "@/components/OnboardingHint";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";
import type { TopicRow } from "@/app/vocabulary/page";

const TOPIC_ICONS = ["📚", "💼", "☀️", "🎯", "🚀", "🌱", "🎨", "🔥", "💡", "🌍", "🎵", "✈️"];

export default function TopicList({ initialTopics }: { initialTopics: TopicRow[] }) {
  const router = useRouter();
  const { language } = useLanguage();
  const [topics, setTopics] = useState(initialTopics);
  const [showForm, setShowForm] = useState(false);
  const [icon, setIcon] = useState(TOPIC_ICONS[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalWords = topics.reduce((sum, t) => sum + t.wordCount, 0);

  function closeForm() {
    setShowForm(false);
    setIcon(TOPIC_ICONS[0]);
    setName("");
    setDescription("");
    setError("");
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên chủ đề.");
      return;
    }

    setCreating(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Bạn cần đăng nhập.");
      setCreating(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("vocabulary_topics")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        language,
        icon,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError("Không thể tạo chủ đề. Vui lòng thử lại.");
      setCreating(false);
      return;
    }

    router.push(`/vocabulary/${data.id}`);
  }

  async function confirmDelete() {
    if (!confirmId) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("vocabulary_topics")
      .delete()
      .eq("id", confirmId);

    if (deleteError) {
      setDeleting(false);
      return;
    }

    setTopics((prev) => prev.filter((t) => t.id !== confirmId));
    setDeleting(false);
    setConfirmId(null);
  }

  const createButton = (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
    >
      + Tạo chủ đề
    </button>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="rounded-xl border-2 border-black bg-white px-4 py-2 text-center shadow-[3px_3px_0_0_#000]">
            <p className="text-lg font-bold text-black">{topics.length}</p>
            <p className="text-xs text-neutral-500">Chủ đề</p>
            <span className="mx-auto mt-1 block h-1 w-6 rounded-full bg-emerald-400" />
          </div>
          <div className="rounded-xl border-2 border-black bg-white px-4 py-2 text-center shadow-[3px_3px_0_0_#000]">
            <p className="text-lg font-bold text-black">{totalWords}</p>
            <p className="text-xs text-neutral-500">Từ vựng</p>
            <span className="mx-auto mt-1 block h-1 w-6 rounded-full bg-black" />
          </div>
        </div>
        {topics.length === 0 ? (
          <OnboardingHint
            title="Bước 1: Tạo chủ đề ✨"
            description="Ấn vào đây để bắt đầu tạo chủ đề từ vựng đầu tiên của bạn nhé!"
          >
            {createButton}
          </OnboardingHint>
        ) : (
          createButton
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={closeForm}
            className="fixed inset-0 cursor-default bg-black/50"
          />
          <form
            onSubmit={handleCreate}
            className="relative flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-emerald-200 text-xl">
                  {icon}
                </span>
                <div>
                  <h2 className="font-bold text-black">Tạo chủ đề mới</h2>
                  <p className="text-xs text-neutral-500">Lưu vào tài khoản của bạn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Biểu tượng
              </p>
              <div className="grid grid-cols-6 gap-2">
                {TOPIC_ICONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setIcon(item)}
                    className={
                      item === icon
                        ? "flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-amber-200 text-lg shadow-[2px_2px_0_0_#000]"
                        : "flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-white text-lg hover:bg-neutral-50"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tên chủ đề <span className="text-red-600">*</span>
              </label>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Từ vựng về Du lịch"
                className="w-full rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Mô tả <span className="normal-case text-neutral-400">(không bắt buộc)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Chủ đề này gồm những từ về..."
                className="w-full resize-none rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <p className="-mt-2 text-xs text-neutral-400">
              Ngôn ngữ: {LANGUAGES.find((item) => item.id === language)?.flag}{" "}
              {LANGUAGES.find((item) => item.id === language)?.label} — đổi ở góc trên.
            </p>

            {error && (
              <p className="rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-full border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="flex-1 rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "+ Tạo chủ đề"}
              </button>
            </div>
          </form>
        </div>
      )}

      {topics.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black bg-white p-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-black bg-emerald-100 text-2xl">
            📁
          </span>
          <p className="mb-1 font-semibold text-black">Chưa có chủ đề nào</p>
          <p className="mb-4 text-sm text-neutral-500">
            Tạo chủ đề đầu tiên để bắt đầu lưu từ vựng nhé!
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full border-2 border-black bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            + Tạo chủ đề đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="group relative rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
            >
              <Link href={`/vocabulary/${topic.id}`} className="block">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-emerald-200 text-lg">
                  {topic.icon}
                </span>
                <p className="font-semibold text-black">
                  {LANGUAGES.find((item) => item.id === topic.language)?.flag} {topic.name}
                </p>
                {topic.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">
                    {topic.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-400">{topic.wordCount} từ</p>
              </Link>
              <button
                type="button"
                onClick={() => setConfirmId(topic.id)}
                title="Xoá chủ đề"
                aria-label="Xoá chủ đề"
                className="absolute right-3 top-3 rounded-lg px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Xoá chủ đề này?"
        description="Toàn bộ từ vựng trong chủ đề cũng sẽ bị xoá. Không thể hoàn tác."
        confirmLabel="Xoá"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </>
  );
}
