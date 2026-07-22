import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decrypt, maskKey } from "@/lib/crypto";
import GeminiKeyForm from "@/components/GeminiKeyForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("gemini_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  let maskedKey: string | null = null;
  if (settings?.gemini_api_key) {
    try {
      maskedKey = maskKey(decrypt(settings.gemini_api_key));
    } catch (err) {
      console.error("Failed to decrypt stored Gemini API key", err);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-white">Cài đặt</h1>
      <p className="mb-6 text-sm text-slate-400">
        Dùng API key Gemini của riêng bạn để tạo câu chuyện — không bị giới hạn số câu
        chuyện/ngày chung của app.
      </p>

      <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-white">Cách lấy API key miễn phí</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-400">
          <li>
            Vào{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-400 underline hover:text-amber-300"
            >
              aistudio.google.com/apikey
            </a>{" "}
            và đăng nhập bằng tài khoản Google cá nhân (không dùng email công ty/Workspace).
          </li>
          <li>
            Bấm <strong className="text-white">Create API key</strong> → chọn{" "}
            <strong className="text-white">Create API key in new project</strong>.
          </li>
          <li>Copy key vừa tạo và dán vào ô bên dưới.</li>
        </ol>
      </div>

      <GeminiKeyForm maskedKey={maskedKey} />
    </main>
  );
}
