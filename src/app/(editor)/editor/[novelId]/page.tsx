import { createClient } from "@/lib/supabase/server";
import { NovelEditor } from "@/components/editor/Editor";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;
  const supabase = await createClient();

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

  const chapters = (novel.chapters ?? [])
    .sort((a, b) => a.position - b.position);

  const firstChapter = chapters[0] ?? null;

  return (
    <NovelEditor
      novelId={novel.id}
      novelTitle={novel.title}
      projectTitle={project?.title ?? "Mon projet"}
      chapters={chapters}
      initialChapterId={firstChapter?.id ?? null}
      wordGoal={novel.word_goal}
    />
  );
}
