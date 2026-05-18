import { createClient } from "@/lib/supabase/server";
import { NovelEditor } from "@/components/editor/Editor";
import { personaPrefs } from "@/lib/persona";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Phase 1 : profil + roman (avec titre projet joint) en parallèle.
  // L'ancien code faisait 4 awaits séquentiels — ici on en fait 1 puis 1.
  const [profileRes, novelRes] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("pomo_duration, persona")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("novels")
      .select(
        // projects(title) joint la table parent en une seule requête —
        // évite un round-trip supplémentaire pour le breadcrumb.
        `id, title, current_words, word_goal, project_id,
         projects ( title ),
         chapters (
           id, title, content, word_count, position, status, synopsis, updated_at
         )`,
      )
      .eq("id", novelId)
      .single(),
  ]);

  const pomoDuration =
    (profileRes.data as { pomo_duration?: number } | null)?.pomo_duration ?? 25;
  const showTips = personaPrefs(
    (profileRes.data as { persona?: string | null } | null)?.persona,
  ).showTips;
  const novel = novelRes.data;

  if (!novel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[15px] text-text-tertiary">Roman introuvable.</div>
      </div>
    );
  }

  // Le titre du projet est déjà joint via la relation Supabase.
  const projectTitle =
    (novel as unknown as { projects?: { title: string } | { title: string }[] })
      .projects
      ? Array.isArray(
          (novel as unknown as { projects: { title: string }[] }).projects,
        )
        ? (novel as unknown as { projects: { title: string }[] }).projects[0]?.title
        : (novel as unknown as { projects: { title: string } }).projects.title
      : "Mon projet";

  // Phase 2 : fiches WB du projet (a besoin du project_id résolu phase 1)
  const { data: wbEntries } = await supabase
    .from("wb_entries")
    .select("id, title, subtitle, category, subcategory, main_image_url, status")
    .eq("project_id", novel.project_id)
    .neq("status", "archive")
    .order("updated_at", { ascending: false });

  // Affichage trié par position (StructurePanel attend cet ordre)
  const chapters = (novel.chapters ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  // Chapitre ouvert par défaut : le dernier modifié, peu importe sa position.
  // Fallback sur le premier chapitre par position si aucune date dispo.
  type ChapterRow = (typeof chapters)[number];
  const lastEdited = chapters.reduce<ChapterRow | null>((acc, c) => {
    const t = c.updated_at ? new Date(c.updated_at).getTime() : 0;
    if (!acc) return c;
    const accT = acc.updated_at ? new Date(acc.updated_at).getTime() : 0;
    return t > accT ? c : acc;
  }, null);
  const firstChapter = lastEdited ?? chapters[0] ?? null;

  return (
    <NovelEditor
      novelId={novel.id}
      projectId={novel.project_id}
      novelTitle={novel.title}
      projectTitle={projectTitle ?? "Mon projet"}
      chapters={chapters}
      initialChapterId={firstChapter?.id ?? null}
      wordGoal={novel.word_goal}
      wbEntries={wbEntries ?? []}
      pomoDuration={pomoDuration}
      showTips={showTips}
    />
  );
}
