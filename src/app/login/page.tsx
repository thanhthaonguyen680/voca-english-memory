"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setSending(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCode("");
    setStep("code");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setVerifying(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setVerifying(false);
      setError("Mã không đúng hoặc đã hết hạn. Vui lòng thử lại.");
      return;
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
        <h1 className="mb-2 text-2xl font-semibold text-white">Đăng nhập</h1>

        {step === "email" ? (
          <>
            <p className="mb-6 text-sm text-slate-400">
              Nhập email để nhận mã đăng nhập, không cần mật khẩu.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendCode();
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
              >
                {sending ? "Đang gửi..." : "Gửi mã đăng nhập"}
              </button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-400">
              Đã gửi email tới <strong className="text-white">{email}</strong>. Nhập mã 6 số
              trong email vào ô dưới đây, hoặc bấm link trong email nếu bạn đang mở trên cùng
              trình duyệt.
            </p>
            <form onSubmit={verifyCode} className="flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-center text-lg tracking-[0.3em] text-white outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
              <button
                type="submit"
                disabled={verifying}
                className="rounded-lg bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-50"
              >
                {verifying ? "Đang xác nhận..." : "Xác nhận"}
              </button>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  ← Đổi email
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => sendCode()}
                  className="font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
                >
                  {sending ? "Đang gửi..." : "Gửi lại mã"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
