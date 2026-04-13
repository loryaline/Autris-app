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

  // Build weekly activity from chapter updates
  const allChapters = projects?.flatMap(p =>
    (p.novels ?? []).flatMap((n: { chapters?: { updated_at: string; word_count: number }[] }) => n.chapters ?? [])
  ) ?? [];

  const today = new Date();
  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const dayStr = day.toISOString().slice(0, 10);
    const active = allChapters.some((c: { updated_at: string; word_count: number }) =>
      c.updated_at.slice(0, 10) === dayStr && c.word_count > 0
    );
    return { day: day.toLocaleDateString("fr-FR", { weekday: "narrow" }), active };
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
                className={`w-[14px] h-[14px] rounded-[3px] ${
                  d.active ? "bg-primary" : "bg-bg-hover"
                }`}
                title={d.day}
              />
              <span className="text-[9px] text-text-quaternary">{d.day}</span>
            </div>
          ))}
        </div>
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
