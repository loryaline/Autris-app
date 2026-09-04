import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "@/components/ideas/NoteEditor";

/**
 * Une note neuve.
 *
 * Rien n'est écrit en base à l'ouverture : la ligne naît à la première
 * frappe. Ouvrir puis revenir ne laisse donc aucune note vide derrière soi.
 */
export default async function NouvelleNotePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return <NoteEditor idea={null} projects={projects ?? []} />;
}
