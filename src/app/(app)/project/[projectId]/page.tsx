import { createClient } from "@/lib/supabase/server";
import { ProjectSettings } from "./project-settings-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, genre, created_at, novels(id, title, current_words, word_goal, ui_theme)")
    .eq("id", projectId)
    .single();

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[15px] text-text-tertiary">Projet introuvable.</div>
      </div>
    );
  }

  return (
    <ProjectSettings
      project={{
        id: project.id,
        title: project.title,
        genre: project.genre,
        created_at: project.created_at,
        novels: project.novels ?? [],
      }}
    />
  );
}
