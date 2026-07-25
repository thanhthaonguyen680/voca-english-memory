import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VocabularyItem } from "@/lib/supabase/types";

// Fixes a mistyped meaning for one word within one specific story's vocabulary_used —
// scoped to that story only, not a global "edit this word everywhere" operation, since
// /review now treats each story as its own independent deck.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: storyId } = await params;
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

  const { data: story, error: fetchError } = await supabase
    .from("stories")
    .select("vocabulary_used")
    .eq("id", storyId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !story) {
    return NextResponse.json({ error: "Không tìm thấy câu chuyện." }, { status: 404 });
  }

  const target = word.toLowerCase();
  let found = false;
  const updatedWords: VocabularyItem[] = (story.vocabulary_used as VocabularyItem[]).map(
    (item) => {
      if (item.word.trim().toLowerCase() === target) {
        found = true;
        return { ...item, meaning };
      }
      return item;
    },
  );

  if (!found) {
    return NextResponse.json({ error: "Không tìm thấy từ trong câu chuyện." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("stories")
    .update({ vocabulary_used: updatedWords })
    .eq("id", storyId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to update story vocabulary meaning", updateError);
    return NextResponse.json({ error: "Không thể lưu nghĩa mới." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
