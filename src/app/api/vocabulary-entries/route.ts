import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lets a user fix a mistyped meaning (e.g. entered in the wrong row while bulk-adding
// words) directly from the /review flashcards, instead of it staying wrong forever.
export async function PATCH(request: Request) {
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

  const word = String((body as { word?: unknown })?.word ?? "").trim();
  const meaning = String((body as { meaning?: unknown })?.meaning ?? "").trim();

  if (!word || !meaning) {
    return NextResponse.json({ error: "Thiếu từ hoặc nghĩa mới." }, { status: 400 });
  }

  const { error } = await supabase
    .from("vocabulary_entries")
    .update({ meaning })
    .eq("user_id", user.id)
    .ilike("word", word);

  if (error) {
    console.error("Failed to update vocabulary meaning", error);
    return NextResponse.json({ error: "Không thể lưu nghĩa mới." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
