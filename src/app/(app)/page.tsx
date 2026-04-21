import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { DashboardClient } from "./dashboard-client";
import { AutarieWBNudge } from "@/components/home/AutarieWBNudge";

const DEFAULT_DAILY_GOAL = 500;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch projects with novels and their chapters
  const { data: projects } = await supabase
    .from("projects")
    .select("*, novels(*, status, chapters(id, title, updated_at, word_count))")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Calculate total words
  const totalWords = projects?.reduce((sum, p) =>
    sum + (p.novels?.reduce((s: number, n: { current_words: number }) => s + n.current_words, 0) ?? 0), 0) ?? 0;

  // Roman actif : le calendrier suit UNIQUEMENT ses versions de chapitres
  // (cohérent avec l'objectif quotidien, qui est celui du roman actif).
  const activeNovelEarly = (projects ?? [])
    .flatMap((p) => p.novels ?? [])
    .find((n: { is_active?: boolean }) => n.is_active);
  const activeChapterIds: string[] = activeNovelEarly
    ? ((activeNovelEarly as { chapters?: { id: string }[] }).chapters ?? []).map(
        (c) => c.id
      )
    : [];

  const { data: versions } =
    activeChapterIds.length > 0
      ? await supabase
          .from("chapter_versions")
          .select("chapter_id, word_count, created_at")
          .eq("user_id", user.id)
          .in("chapter_id", activeChapterIds)
          .order("created_at", { ascending: true })
      : { data: [] as { chapter_id: string; word_count: number; created_at: string }[] };

  // ---- Lecture de daily_activity (agrégats pré-calculés par triggers) ----
  // Couvre WB (teal) et planif (ambre) pour le mois courant.
  // La rédaction reste calculée à partir de chapter_versions (scope roman actif),
  // pour éviter que des imports dans d'autres romans polluent le calendrier.
  const nowForQuery = new Date();
  const monthStartIso = new Date(nowForQuery.getFullYear(), nowForQuery.getMonth(), 1)
    .toISOString().slice(0, 10);
  const monthEndIso = new Date(nowForQuery.getFullYear(), nowForQuery.getMonth() + 1, 0)
    .toISOString().slice(0, 10);

  const { data: activityRows } = await supabase
    .from("daily_activity")
    .select("date, wb_activity, wb_count, plan_activity, plan_count")
    .eq("user_id", user.id)
    .gte("date", monthStartIso)
    .lte("date", monthEndIso);

  // Pour le nudge WB : dernière date connue avec wb_activity = true.
  const { data: lastWbRow } = await supabase
    .from("daily_activity")
    .select("date")
    .eq("user_id", user.id)
    .eq("wb_activity", true)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activityByDate = new Map<string, {
    wb_count: number;
    plan_count: number;
    wb_activity: boolean;
    plan_activity: boolean;
  }>();
  for (const r of activityRows ?? []) {
    activityByDate.set(r.date, {
      wb_count: r.wb_count ?? 0,
      plan_count: r.plan_count ?? 0,
      wb_activity: !!r.wb_activity,
      plan_activity: !!r.plan_activity,
    });
  }

  // Pre-group versions by chapter for efficiency
  const versionsByChapter = new Map<string, { wc: number; ts: number }[]>();
  for (const v of versions ?? []) {
    const ts = new Date(v.created_at).getTime();
    if (!versionsByChapter.has(v.chapter_id)) versionsByChapter.set(v.chapter_id, []);
    versionsByChapter.get(v.chapter_id)!.push({ wc: v.word_count, ts });
  }

  function wordsOnDay(dayStart: number): number {
    const dayEnd = dayStart + 86_400_000;
    let total = 0;
    for (const vs of versionsByChapter.values()) {
      const upToEnd = vs.filter((v) => v.ts < dayEnd);
      const upToStart = vs.filter((v) => v.ts < dayStart);
      const end = upToEnd.length ? upToEnd[upToEnd.length - 1].wc : 0;
      const start = upToStart.length ? upToStart[upToStart.length - 1].wc : 0;
      total += Math.max(0, end - start);
    }
    return total;
  }

  // Roman actif (pour l'objectif quotidien)
  const allNovels = projects?.flatMap(p => p.novels ?? []) ?? [];
  const activeNovel = allNovels.find((n: { is_active?: boolean }) => n.is_active);

  // Dernier roman édité (pour le raccourci "Continuer à écrire")
  const lastNovel = allNovels.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];

  // Objectif quotidien : words_per_session × sessions_per_week / 7
  // (uniquement depuis le roman marqué actif)
  const DAILY_GOAL = (() => {
    if (!activeNovel) return DEFAULT_DAILY_GOAL;
    const wps = (activeNovel as { words_per_session?: number | null }).words_per_session ?? 0;
    const spw = (activeNovel as { sessions_per_week?: number | null }).sessions_per_week ?? 0;
    if (wps > 0 && spw > 0) return Math.max(50, Math.round((wps * spw) / 7));
    return DEFAULT_DAILY_GOAL;
  })();

  // Monthly activity (current month)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();
  // Monday-first offset
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7;

  function isoDate(y: number, m: number, d: number): string {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  const monthActivity = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayStart = new Date(year, month, dayNum).getTime();
    const words = wordsOnDay(dayStart);
    const row = activityByDate.get(isoDate(year, month, dayNum));
    const wbCount = row?.wb_count ?? 0;
    const planCount = row?.plan_count ?? 0;
    // Intensités 0..1 (4 paliers visuels appliqués au rendu via opacité)
    const redactionIntensity = Math.min(1, words / Math.max(DAILY_GOAL, 1));
    const wbIntensity = Math.min(1, wbCount / 3);
    const planIntensity = Math.min(1, planCount / 3);
    return {
      day: dayNum,
      words,
      wbCount,
      planCount,
      ratio: redactionIntensity,
      wbIntensity,
      planIntensity,
      isFuture: dayNum > todayNum,
      isToday: dayNum === todayNum,
    };
  });

  // Encouragement WB — jours depuis dernière activité WB (via daily_activity)
  const lastWbDate = lastWbRow?.date ? new Date(lastWbRow.date).getTime() : 0;
  const daysSinceWB =
    lastWbDate > 0 ? Math.floor((Date.now() - lastWbDate) / 86_400_000) : Infinity;
  const recentRedaction = monthActivity
    .slice(Math.max(0, todayNum - 7), todayNum)
    .some((d) => d.words > 0);
  const showWBNudge = recentRedaction && daysSinceWB > 7;

  // Streak : jours consécutifs depuis aujourd'hui avec au moins 1 mot
  let streak = 0;
  for (let d = todayNum; d >= 1; d--) {
    if (monthActivity[d - 1].words > 0) streak++;
    else break;
  }

  // Résumé mensuel : réel vs objectif attendu (DAILY_GOAL × jours écoulés)
  const monthWordsTotal = monthActivity.reduce((s, d) => s + d.words, 0);
  const expectedSoFar = DAILY_GOAL * todayNum;
  const monthRatio = expectedSoFar > 0 ? monthWordsTotal / expectedSoFar : 0;
  const monthPct = Math.round(monthRatio * 100);
  const monthStatusColor =
    monthRatio >= 1 ? "text-emerald-600" : monthRatio >= 0.7 ? "text-amber" : "text-text-tertiary";

  // Estimation DYNAMIQUE basée sur le rythme réel (moyenne /jour depuis le début du mois)
  // pour le roman actif. Utilise word_goal - current_words pour le restant.
  const activeGoal = (activeNovel as { word_goal?: number | null } | undefined)?.word_goal ?? 0;
  const activeWords = (activeNovel as { current_words?: number } | undefined)?.current_words ?? 0;
  const remainingWords = Math.max(0, activeGoal - activeWords);
  const realDailyPace = todayNum > 0 ? monthWordsTotal / todayNum : 0;
  const etaDays = realDailyPace > 0 ? Math.ceil(remainingWords / realDailyPace) : 0;
  const etaDate = etaDays > 0 ? new Date(Date.now() + etaDays * 86_400_000) : null;
  // Vs objectif théorique (rythme voulu)
  const targetDailyPace = DAILY_GOAL;
  const paceDelta = realDailyPace - targetDailyPace;
  const paceVerdict =
    activeGoal === 0
      ? null
      : realDailyPace <= 0
        ? "noData"
        : paceDelta >= 0
          ? "ahead"
          : paceDelta > -targetDailyPace * 0.3
            ? "onTrack"
            : "behind";

  const lastProject = lastNovel
    ? projects?.find(p => p.id === lastNovel.project_id)
    : null;

  const lastChapter = lastNovel?.chapters
    ?.sort((a: { updated_at: string }, b: { updated_at: string }) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0] ?? null;

  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="p-3 max-w-[960px]">
      {/* Nudge WB Autarie (max 1x/semaine, fermable) */}
      {showWBNudge && <AutarieWBNudge daysSinceWB={daysSinceWB} />}

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

      {/* Monthly calendar */}
      <Card className="p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] font-medium text-text-primary capitalize">{monthName}</div>
          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <span className="text-[11px] text-amber font-medium bg-amber/10 px-1.5 py-0.5 rounded">
                🔥 {streak} jour{streak > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-[10px] text-text-quaternary">
              objectif {DAILY_GOAL}/j
            </span>
          </div>
        </div>

        {/* Day headers Mon-Sun */}
        <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
          {["L","M","M","J","V","S","D"].map((d, i) => (
            <div key={i} className="text-[9px] text-text-quaternary text-center">{d}</div>
          ))}
        </div>

        {/* Monthly summary: actual vs expected */}
        <div className="mb-2 p-2 rounded-[var(--radius-sm)] bg-bg-tertiary">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] text-text-tertiary">
              Ce mois : <span className="text-text-primary font-medium">{monthWordsTotal.toLocaleString("fr-FR")}</span>
              {" / "}
              <span className="text-text-tertiary">{expectedSoFar.toLocaleString("fr-FR")} attendus</span>
            </div>
            <div className={`text-[11px] font-medium ${monthStatusColor}`}>
              {monthPct}%
            </div>
          </div>
          <div className="h-1 rounded-full bg-bg-hover overflow-hidden">
            <div
              className={`h-full rounded-full ${monthRatio >= 1 ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${Math.min(100, monthRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* Estimation dynamique basée sur le rythme RÉEL */}
        {activeNovel && activeGoal > 0 && (
          <div className="mb-2 p-2 rounded-[var(--radius-sm)] bg-bg-tertiary border border-border">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] text-text-tertiary">
                Estimation de fin (rythme réel)
              </div>
              {paceVerdict === "ahead" && (
                <span className="text-[10px] text-emerald-600 font-medium">✓ en avance</span>
              )}
              {paceVerdict === "onTrack" && (
                <span className="text-[10px] text-amber font-medium">≈ dans les temps</span>
              )}
              {paceVerdict === "behind" && (
                <span className="text-[10px] text-red font-medium">⚠ en retard</span>
              )}
              {paceVerdict === "noData" && (
                <span className="text-[10px] text-text-quaternary">pas encore de rythme</span>
              )}
            </div>
            {realDailyPace > 0 && etaDays > 0 ? (
              <>
                <div className="text-[13px] text-text-primary">
                  Fin estimée :{" "}
                  <span className="font-medium">
                    {etaDate?.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-text-tertiary">
                    {" "}— {etaDays} jour{etaDays > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-[10px] text-text-quaternary mt-0.5">
                  Rythme réel : {Math.round(realDailyPace).toLocaleString("fr-FR")} mots/j
                  {" · "}cible : {targetDailyPace.toLocaleString("fr-FR")} mots/j
                  {" · "}restant : {remainingWords.toLocaleString("fr-FR")} mots
                </div>
              </>
            ) : remainingWords === 0 ? (
              <div className="text-[13px] text-text-primary">
                Objectif atteint 🎉
              </div>
            ) : (
              <div className="text-[11px] text-text-tertiary">
                Écris quelques jours pour obtenir une estimation basée sur ton rythme.
              </div>
            )}
          </div>
        )}

        {/* Légende multi-couleurs */}
        <div className="flex items-center gap-3 mb-1.5 text-[9px] text-text-quaternary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: "#7F77DD" }} />
            Rédaction
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: "#5DCAA5" }} />
            World building
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: "#EF9F27" }} />
            Planification
          </span>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-[3px]">
          {/* Empty cells before the 1st */}
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {monthActivity.map((d) => {
            const bands = [
              d.ratio > 0 && { color: "#7F77DD", op: 0.15 + d.ratio * 0.85, label: "rédaction" },
              d.wbIntensity > 0 && { color: "#5DCAA5", op: 0.15 + d.wbIntensity * 0.85, label: "world building" },
              d.planIntensity > 0 && { color: "#EF9F27", op: 0.15 + d.planIntensity * 0.85, label: "planification" },
            ].filter(Boolean) as { color: string; op: number; label: string }[];

            const tooltip = d.isFuture
              ? ""
              : [
                  `${d.day}`,
                  d.words > 0 ? `✎ ${d.words.toLocaleString("fr-FR")} mots` : null,
                  d.wbCount > 0 ? `◐ ${d.wbCount} fiche${d.wbCount > 1 ? "s" : ""} WB` : null,
                  d.planCount > 0 ? `▦ ${d.planCount} élément${d.planCount > 1 ? "s" : ""} planif` : null,
                ].filter(Boolean).join(" · ");

            return (
              <div
                key={d.day}
                title={tooltip}
                className={`relative h-[18px] rounded-[3px] flex items-center justify-center overflow-hidden ${
                  d.isFuture
                    ? "bg-bg-tertiary"
                    : d.isToday
                      ? "ring-1 ring-primary bg-bg-hover"
                      : "bg-bg-hover"
                }`}
              >
                {/* Bandes horizontales : 1/2/3 couleurs empilées */}
                {!d.isFuture &&
                  bands.map((b, idx) => (
                    <div
                      key={b.label}
                      className="absolute left-0 right-0 rounded-[2px]"
                      style={{
                        top: `${(idx * 100) / bands.length}%`,
                        height: `${100 / bands.length}%`,
                        background: b.color,
                        opacity: b.op,
                      }}
                    />
                  ))}
                <span
                  className={`relative text-[9px] z-10 ${
                    d.isToday ? "font-bold text-primary" : "text-text-quaternary"
                  }`}
                >
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

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
