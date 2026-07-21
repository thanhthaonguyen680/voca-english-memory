"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-7 shadow-sm">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-base font-bold text-gray-900">
          V
        </span>
        <h1 className="mb-2 text-2xl font-semibold text-white">Đăng nhập</h1>
        <p className="mb-6 text-sm text-gray-400">
          Nhập email để nhận đường link đăng nhập (magic link), không cần mật khẩu.
        </p>

        {status === "sent" ? (
          <p className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            Đã gửi link đăng nhập tới <strong>{email}</strong>. Vui lòng kiểm tra hộp thư của
            bạn.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
            >
              {status === "loading" ? "Đang gửi..." : "Gửi magic link"}
            </button>
            {status === "error" && <p className="text-sm text-red-400">{errorMsg}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
