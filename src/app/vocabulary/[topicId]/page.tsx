import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopicDetail from "@/components/TopicDetail";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { isLanguage } from "@/lib/utils/language";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: topic, error: topicError } = await supabase
    .from("vocabulary_topics")
    .select("id, name, description, language, icon, created_at")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .single();

  if (topicError || !topic) {
    notFound();
  }

  const [{ data: words }, { data: latestStory }] = await Promise.all([
    supabase
      .from("vocabulary_entries")
      .select("id, word, meaning, word_type, ipa")
      .eq("topic_id", topicId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("stories")
      .select("content, translation, vocabulary_used")
      .eq("topic_id", topicId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

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
        initialStory={
          latestStory
            ? {
                content: latestStory.content,
                translation: latestStory.translation,
                vocabulary_used: latestStory.vocabulary_used ?? [],
              }
            : null
        }
      />
    </main>
  );
}
