import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const apiKey = String((body as { apiKey?: unknown })?.apiKey ?? "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Vui lòng nhập API key." }, { status: 400 });
  }

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    gemini_api_key: encrypt(apiKey),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to save Gemini API key", error);
    return NextResponse.json({ error: "Không thể lưu key." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_settings")
    .update({ gemini_api_key: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to remove Gemini API key", error);
    return NextResponse.json({ error: "Không thể xoá key." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
