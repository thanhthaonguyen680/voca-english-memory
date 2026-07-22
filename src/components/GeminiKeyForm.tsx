"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function GeminiKeyForm({ maskedKey }: { maskedKey: string | null }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/user-settings/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Không thể lưu key.");
        return;
      }

      setApiKey("");
      setSuccess("Đã lưu key của bạn.");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/user-settings/gemini-key", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Không thể xoá key.");
        setRemoving(false);
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới server.");
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-white">Gemini API key của bạn</h2>

      {maskedKey ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5">
          <span className="text-sm text-amber-300">
            Đang dùng key: <span className="font-mono">{maskedKey}</span>
          </span>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={removing}
            className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Xoá key
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-400">
          Bạn chưa có key riêng — đang dùng key chung của app (giới hạn theo ngày).
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="Dán API key vào đây (bắt đầu bằng AQ. hoặc AIza...)"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
        />
        <button
          type="submit"
          disabled={saving || !apiKey.trim()}
          className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : maskedKey ? "Đổi key" : "Lưu key"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Xoá API key riêng?"
        description="Sau khi xoá, bạn sẽ quay lại dùng key chung của app (có giới hạn theo ngày)."
        confirmLabel="Xoá"
        danger
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
