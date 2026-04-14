import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WbClient } from "./wb-client";
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

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, genre")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

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

  return (
    <WbClient
      projectId={projectId}
      projectTitle={project.title}
      genre={project.genre as Genre}
      initialEntries={entries ?? []}
    />
  );
}
