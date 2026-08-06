import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatSession from "@/components/ChatSession";
import { CHAT_AI_NAME } from "@/lib/constants";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-black">Luyện nói với {CHAT_AI_NAME}</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Nói hoặc gõ câu trả lời, {CHAT_AI_NAME} sẽ trò chuyện lại bằng cả chữ và giọng nói.
      </p>

      <ChatSession />
    </main>
  );
}
