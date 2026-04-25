import { createClient } from "@/lib/supabase/server";
import { NovelEditor } from "@/components/editor/Editor";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let pomoDuration = 25;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pomo_duration")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.pomo_duration) pomoDuration = profile.pomo_duration;
  }

  const { data: novel } = await supabase
    .from("novels")
    .select("id, title, current_words, word_goal, project_id, chapters(id, title, content, word_count, position, status, synopsis)")
    .eq("id", novelId)
    .single();

  if (!novel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[15px] text-text-tertiary">Roman introuvable.</div>
      </div>
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("title")
    .eq("id", novel.project_id)
    .single();

  // Fiches WB du projet pour l'onglet "World" de l'éditeur
  const { data: wbEntries } = await supabase
    .from("wb_entries")
    .select("id, title, subtitle, category, subcategory, main_image_url, status")
    .eq("project_id", novel.project_id)
    .neq("status", "archive")
    .order("updated_at", { ascending: false });

  const chapters = (novel.chapters ?? [])
    .sort((a, b) => a.position - b.position);

  const firstChapter = chapters[0] ?? null;

  return (
    <NovelEditor
      novelId={novel.id}
      projectId={novel.project_id}
      novelTitle={novel.title}
      projectTitle={project?.title ?? "Mon projet"}
      chapters={chapters}
      initialChapterId={firstChapter?.id ?? null}
      wordGoal={novel.word_goal}
      wbEntries={wbEntries ?? []}
      pomoDuration={pomoDuration}
    />
  );
}
