import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WbClient } from "./wb-client";
import { personaPrefs } from "@/lib/persona";
import type { Genre } from "@/types/database";

export default async function WorldBuildingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, genre")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("persona").eq("id", user.id).single(),
  ]);
  const showTips = personaPrefs(
    (profile as { persona: string | null } | null)?.persona,
  ).showTips;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        Projet introuvable
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("wb_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Liste des romans (livres) du projet — utilisée pour attribuer une fiche à un livre.
  const { data: novels } = await supabase
    .from("novels")
    .select("id, title")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Charge tous les liens dont les deux extrémités appartiennent à ce projet
  const entryIds = (entries ?? []).map((e) => e.id);
  let links: unknown[] = [];
  if (entryIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("wb_links")
      .select("*")
      .in("from_entry_id", entryIds);
    links = linkRows ?? [];
  }

  return (
    <WbClient
      projectId={projectId}
      projectTitle={project.title}
      genre={project.genre as Genre}
      initialEntries={entries ?? []}
      initialLinks={links as never}
      novels={(novels ?? []) as { id: string; title: string }[]}
      showTips={showTips}
    />
  );
}
