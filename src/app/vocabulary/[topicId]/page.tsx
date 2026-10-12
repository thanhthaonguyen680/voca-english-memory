import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import TopicDetail from "@/components/TopicDetail";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { isLanguage } from "@/lib/utils/language";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  if (!user) {
    redirect("/login");
  }

  // The topic and its words don't depend on each other — fetch both in one round-trip's time.
  const [{ data: topic, error: topicError }, { data: words }] = await Promise.all([
    supabase
      .from("vocabulary_topics")
      .select("id, name, description, language, icon")
      .eq("id", topicId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("vocabulary_entries")
      .select("id, word, meaning, word_type, ipa")
      .eq("topic_id", topicId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (topicError || !topic) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <TopicDetail
        topic={{
          id: topic.id,
          name: topic.name,
          description: topic.description,
          language: isLanguage(topic.language) ? topic.language : DEFAULT_LANGUAGE,
          icon: topic.icon || "📚",
        }}
        initialWords={(words ?? []).map((w) => ({
          id: w.id,
          word: w.word,
          meaning: w.meaning,
          wordType: w.word_type,
          ipa: w.ipa,
        }))}
      />
    </main>
  );
}
