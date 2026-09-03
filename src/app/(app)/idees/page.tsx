import { createClient } from "@/lib/supabase/server";
import { IdeasClient } from "./ideas-client";
import type { Idea } from "@/types/database";

/**
 * La boîte à idées — écran d'accueil de la version mobile.
 *
 * Lue par `user_id` SEUL, jamais par projet : c'est ce qui rend une idée
 * sans projet consultable de partout, y compris depuis un roman auquel
 * elle n'appartient pas.
 */
export default async function IdeasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [ideasRes, projectsRes] = await Promise.all([
    supabase
      .from("ideas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  // La table peut ne pas exister encore (migration non passée) : on le dit
  // plutôt que de casser la page.
  if (ideasRes.error) {
    return (
      <div className="max-w-[680px] mx-auto px-4 py-10">
        <h1
          className="font-serif text-[26px] mb-2"
          style={{ color: "var(--text-1)" }}
        >
          Idées
        </h1>
        <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>
          La boîte à idées n&apos;est pas encore installée. Exécutez la
          migration <code>migration-ideas.sql</code> dans le SQL Editor de
          Supabase, puis rechargez cette page.
        </p>
      </div>
    );
  }

  return (
    <IdeasClient
      initialIdeas={(ideasRes.data ?? []) as Idea[]}
      projects={projectsRes.data ?? []}
    />
  );
}
