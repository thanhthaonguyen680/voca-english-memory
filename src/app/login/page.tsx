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
      <div className="rounded-2xl border-2 border-black bg-white p-7 shadow-[5px_5px_0_0_#000]">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-emerald-300 text-base font-bold text-black">
          V
        </span>
        <h1 className="mb-2 text-2xl font-semibold text-black">
          {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="mb-6 text-sm text-neutral-600">
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
            className="rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full border-2 border-black bg-emerald-300 px-3.5 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "signin"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-700">{info}</p>}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setInfo("");
          }}
          className="mt-4 text-sm text-neutral-600 hover:text-black"
        >
          {mode === "signin"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </main>
  );
}
