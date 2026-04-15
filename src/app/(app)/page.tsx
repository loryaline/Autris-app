import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch projects with novels and their chapters
  const { data: projects } = await supabase
    .from("projects")
    .select("*, novels(*, chapters(id, title, updated_at, word_count))")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Calculate total words
  const totalWords = projects?.reduce((sum, p) =>
    sum + (p.novels?.reduce((s: number, n: { current_words: number }) => s + n.current_words, 0) ?? 0), 0) ?? 0;

  // Build weekly activity from chapter_versions snapshots (delta-based)
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const { data: versions } = await supabase
    .from("chapter_versions")
    .select("chapter_id, word_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // For each chapter, track cumulative word_count per day
  // Words written on day D = (max word_count <= end of day D) - (max word_count <= end of day D-1)
  const DAILY_GOAL = 500;
  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);
    const dayStart = day.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // Per chapter, compute latest word_count up to dayEnd and up to dayStart
    const chapterIds = new Set((versions ?? []).map((v) => v.chapter_id));
    let totalWritten = 0;
    for (const cid of chapterIds) {
      const vs = (versions ?? []).filter((v) => v.chapter_id === cid);
      const upToEnd = vs.filter((v) => new Date(v.created_at).getTime() < dayEnd);
      const upToStart = vs.filter((v) => new Date(v.created_at).getTime() < dayStart);
      const endWc = upToEnd.length ? upToEnd[upToEnd.length - 1].word_count : 0;
      const startWc = upToStart.length ? upToStart[upToStart.length - 1].word_count : 0;
      totalWritten += Math.max(0, endWc - startWc);
    }

    const ratio = Math.min(totalWritten / DAILY_GOAL, 1);
    return {
      day: day.toLocaleDateString("fr-FR", { weekday: "narrow" }),
      words: totalWritten,
      ratio,
    };
  });

  // Find last updated novel and chapter
  const allNovels = projects?.flatMap(p => p.novels ?? []) ?? [];
  const lastNovel = allNovels.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];

  const lastProject = lastNovel
    ? projects?.find(p => p.id === lastNovel.project_id)
    : null;

  // Find the last edited chapter of the last novel
  const lastChapter = lastNovel?.chapters
    ?.sort((a: { updated_at: string }, b: { updated_at: string }) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0] ?? null;

  return (
    <div className="p-3 max-w-[960px]">
      {/* Welcome card */}
      <Card highlight className="p-2.5 mb-3 flex items-center gap-2.5">
        <span className="text-[16px]">🦭</span>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-primary-dark">
            {projects && projects.length > 0
              ? "Autarie vous attend pour écrire !"
              : "Bienvenue sur Autris !"}
          </div>
          <div className="text-[12px] text-primary">
            {projects && projects.length > 0
              ? "Continuez votre histoire là où vous l'avez laissée."
              : "Créez votre premier projet pour commencer à écrire."}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-2">
          <div className="text-[11px] text-text-tertiary mb-0.5">Mots écrits</div>
          <div className="text-[16px] font-medium text-text-primary">
            {totalWords.toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-2">
          <div className="text-[11px] text-text-tertiary mb-0.5">Romans</div>
          <div className="text-[16px] font-medium text-text-primary">
            {allNovels.length}
          </div>
        </div>
        <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-2">
          <div className="text-[11px] text-text-tertiary mb-0.5">Projets</div>
          <div className="text-[16px] font-medium text-text-primary">
            {projects?.length ?? 0}
          </div>
        </div>
        <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-2">
          <div className="text-[11px] text-text-tertiary mb-0.5">XP</div>
          <div className="text-[16px] font-medium text-text-primary">0</div>
          <div className="text-[11px] text-primary">Scribouillard</div>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[11px] text-text-tertiary">Cette semaine</div>
        <div className="flex gap-1">
          {weekActivity.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className="w-[14px] h-[14px] rounded-[3px] bg-bg-hover relative overflow-hidden"
                title={`${d.day} — ${d.words} mots`}
              >
                <div
                  className="absolute inset-0 bg-primary"
                  style={{ opacity: d.ratio === 0 ? 0 : 0.2 + d.ratio * 0.8 }}
                />
              </div>
              <span className="text-[9px] text-text-quaternary">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-text-quaternary ml-1">objectif {500}/j</div>
      </div>

      {/* Last novel shortcut */}
      {lastNovel && lastProject && (
        <Card className="p-3 mb-3">
          <div className="text-[12px] font-medium text-text-primary mb-1">
            Dernière activité — {lastProject.title}
          </div>
          <div className="text-[11px] text-text-tertiary mb-2">
            {lastNovel.title}
            {lastChapter && <> · {lastChapter.title}</>}
            {" · "}{lastNovel.current_words.toLocaleString("fr-FR")} mots
          </div>
          <a
            href={`/editor/${lastNovel.id}`}
            className="inline-block text-[12px] text-primary border border-primary-border rounded-[var(--radius-sm)] px-2 py-0.5 hover:bg-primary-bg transition-colors"
          >
            Continuer à écrire
          </a>
        </Card>
      )}

      {/* Projects list or empty state */}
      <DashboardClient projects={projects ?? []} />
    </div>
  );
}
