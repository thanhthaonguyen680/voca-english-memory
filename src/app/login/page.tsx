"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setLoading(false);
        setError(error.message);
        return;
      }

      if (!data.session) {
        // Email confirmation is still required in Supabase settings.
        setLoading(false);
        setInfo("Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoading(false);
        setError(
          error.message === "Invalid login credentials"
            ? "Email hoặc mật khẩu không đúng."
            : error.message,
        );
        return;
      }
    }

    router.push("/vocabulary");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-7 shadow-sm">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-base font-bold text-slate-900">
          V
        </span>
        <h1 className="mb-2 text-2xl font-semibold text-white">
          {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          {mode === "signin"
            ? "Nhập email và mật khẩu để đăng nhập."
            : "Chỉ mất vài giây."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "signin"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-amber-400">{info}</p>}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setInfo("");
          }}
          className="mt-4 text-sm text-slate-400 hover:text-white"
        >
          {mode === "signin"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </main>
  );
}
