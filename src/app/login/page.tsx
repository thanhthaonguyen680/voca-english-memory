"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/utils/username";

type Mode = "signin" | "signup";

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Tên đăng nhập đã được sử dụng, vui lòng chọn tên khác.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Tên đăng nhập hoặc mật khẩu không đúng.";
  }
  if (lower.includes("password")) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }
  return "Có lỗi xảy ra, vui lòng thử lại.";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      setError(
        "Tên đăng nhập chỉ gồm chữ thường, số và dấu gạch dưới, từ 3-20 ký tự.",
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const email = usernameToEmail(normalized);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: normalized } },
      });

      if (error) {
        setLoading(false);
        setError(translateAuthError(error.message));
        return;
      }

      if (!data.session) {
        setLoading(false);
        setInfo("Không thể tạo tài khoản ngay lúc này. Vui lòng thử lại sau.");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoading(false);
        setError(translateAuthError(error.message));
        return;
      }
    }

    router.push("/vocabulary");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border-2 border-black bg-white p-7 shadow-[5px_5px_0_0_#000]">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-violet-300 text-base font-bold text-black">
          V
        </span>
        <h1 className="mb-2 text-2xl font-semibold text-black">
          {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="mb-6 text-sm text-neutral-600">
          Đăng nhập hoặc đăng ký để bắt đầu tạo chủ đề đầu tiên.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            required
            autoComplete="username"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-300"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full border-2 border-black bg-violet-300 px-3.5 py-2.5 text-sm font-semibold text-black shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "signin"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-violet-700">{info}</p>}
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
