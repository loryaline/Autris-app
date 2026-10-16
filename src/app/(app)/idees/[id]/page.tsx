import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "@/components/ideas/NoteEditor";
import type { Idea } from "@/types/database";
import { utilisateurConnecte } from "@/lib/supabase/utilisateur";

/** Une idée, ouverte en plein écran — c'est-à-dire modifiable. */
export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // Vérification locale du jeton, sans aller-retour réseau — cf. utilisateurConnecte.
  const user = await utilisateurConnecte(supabase);
  if (!user) return null;

  const [ideaRes, projectsRes] = await Promise.all([
    supabase.from("ideas").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("projects")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!ideaRes.data) notFound();

  return (
    <NoteEditor
      idea={ideaRes.data as Idea}
      projects={projectsRes.data ?? []}
    />
  );
}
