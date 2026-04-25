import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { WBNudge } from "@/components/home/WBNudge";
import { MilestoneAlerts, type MilestoneAlertItem } from "@/components/home/MilestoneAlerts";

// Fenêtre d'alerte « jalon approche » : J-7 par défaut. Au-delà, on considère
// que le jalon est encore lointain et on n'embête pas l'utilisatrice.
const MILESTONE_SOON_DAYS = 7;

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

  const nowForQuery = new Date();
  const monthStartIso = new Date(nowForQuery.getFullYear(), nowForQuery.getMonth(), 1)
    .toISOString().slice(0, 10);
  const monthEndIso = new Date(nowForQuery.getFullYear(), nowForQuery.getMonth() + 1, 0)
    .toISOString().slice(0, 10);

  // Source de vérité unique : daily_activity (alimenté par triggers côté DB).
  // Rédaction = words_written (tous romans), WB et planif = counts dédiés.
  const { data: activityRows } = await supabase
    .from("daily_activity")
    .select("date, words_written, wb_activity, wb_count, plan_activity, plan_count")
    .eq("user_id", user.id)
    .gte("date", monthStartIso)
    .lte("date", monthEndIso);

  const { data: lastWbRow } = await supabase
    .from("daily_activity")
    .select("date")
    .eq("user_id", user.id)
    .eq("wb_activity", true)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Milestones du mois (tous romans confondus) — pour la grille calendrier.
  const { data: milestoneRows } = await supabase
    .from("planning_milestones")
    .select("id, title, type, status, color, target_date")
    .eq("user_id", user.id)
    .not("target_date", "is", null)
    .gte("target_date", monthStartIso)
    .lte("target_date", monthEndIso);

  // Milestones à notifier : dépassés (status ≠ done) ou approchant dans les
  // MILESTONE_SOON_DAYS jours. Indépendant du mois courant : un jalon en
  // retard de 2 mois doit toujours être affiché.
  const todayIso = new Date().toISOString().slice(0, 10);
  const soonIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MILESTONE_SOON_DAYS);
    return d.toISOString().slice(0, 10);
  })();
  const { data: alertMilestoneRows } = await supabase
    .from("planning_milestones")
    .select("id, title, type, status, color, target_date, novel_id, novels(title)")
    .eq("user_id", user.id)
    .not("target_date", "is", null)
    .neq("status", "done")
    .lte("target_date", soonIso)
    .order("target_date", { ascending: true });

  type AlertRow = {
    id: string;
    title: string;
    type: string | null;
    status: string | null;
    color: string | null;
    target_date: string | null;
    novel_id: string | null;
    novels: { title: string } | { title: string }[] | null;
  };
  const milestoneAlerts: MilestoneAlertItem[] = (alertMilestoneRows as AlertRow[] | null ?? [])
    .filter((m) => !!m.target_date)
    .map((m) => {
      const novelTitle = Array.isArray(m.novels)
        ? m.novels[0]?.title ?? null
        : m.novels?.title ?? null;
      const target = m.target_date as string;
      const diffMs = new Date(target + "T00:00:00").getTime() - new Date(todayIso + "T00:00:00").getTime();
      const daysDelta = Math.round(diffMs / 86_400_000);
      return {
        id: m.id,
        title: m.title,
        type: m.type ?? "custom",
        status: m.status ?? "planned",
        color: m.color,
        targetDate: target,
        daysDelta, // < 0 = en retard, 0 = aujourd'hui, > 0 = à venir
        novelId: m.novel_id,
        novelTitle,
      };
    });

  type MilestoneLite = {
    id: string;
    title: string;
    type: string;
    status: string;
    color: string | null;
  };
  const milestonesByDate = new Map<string, MilestoneLite[]>();
  for (const m of milestoneRows ?? []) {
    if (!m.target_date) continue;
    const list = milestonesByDate.get(m.target_date) ?? [];
    list.push({
      id: m.id,
      title: m.title,
      type: m.type ?? "custom",
      status: m.status ?? "planned",
      color: m.color ?? null,
    });
    milestonesByDate.set(m.target_date, list);
  }

  const activityByDate = new Map<string, {
    words_written: number;
    wb_count: number;
    plan_count: number;
    wb_activity: boolean;
    plan_activity: boolean;
  }>();
  for (const r of activityRows ?? []) {
    activityByDate.set(r.date, {
      words_written: r.words_written ?? 0,
      wb_count: r.wb_count ?? 0,
      plan_count: r.plan_count ?? 0,
      wb_activity: !!r.wb_activity,
      plan_activity: !!r.plan_activity,
    });
  }

  const allNovels = projects?.flatMap(p => p.novels ?? []) ?? [];
  const activeNovel = allNovels.find((n: { is_active?: boolean }) => n.is_active);

  const lastNovel = allNovels.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];

  const DAILY_GOAL = (() => {
    if (!activeNovel) return DEFAULT_DAILY_GOAL;
    const wps = (activeNovel as { words_per_session?: number | null }).words_per_session ?? 0;
    const spw = (activeNovel as { sessions_per_week?: number | null }).sessions_per_week ?? 0;
    if (wps > 0 && spw > 0) return Math.max(50, Math.round((wps * spw) / 7));
    return DEFAULT_DAILY_GOAL;
  })();

  // Monthly activity
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7;

  function isoDate(y: number, m: number, d: number): string {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  const monthActivity = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const iso = isoDate(year, month, dayNum);
    const row = activityByDate.get(iso);
    const words = row?.words_written ?? 0;
    // Pour l'affichage (intensité, tooltip, streak) on clampe à 0 :
    // un jour à delta négatif (grosse suppression) ne doit pas s'afficher en « rouge »
    // ni apparaître avec une opacité négative. La somme mensuelle, elle, reste nette.
    const wordsDisplay = Math.max(0, words);
    const wbCount = row?.wb_count ?? 0;
    const planCount = row?.plan_count ?? 0;
    const redactionIntensity = Math.min(1, wordsDisplay / Math.max(DAILY_GOAL, 1));
    const wbIntensity = Math.min(1, wbCount / 3);
    const planIntensity = Math.min(1, planCount / 3);
    return {
      day: dayNum,
      words,
      wordsDisplay,
      wbCount,
      planCount,
      ratio: redactionIntensity,
      wbIntensity,
      planIntensity,
      isFuture: dayNum > todayNum,
      isToday: dayNum === todayNum,
      milestones: milestonesByDate.get(iso) ?? [],
    };
  });

  const lastWbDate = lastWbRow?.date ? new Date(lastWbRow.date).getTime() : 0;
  const nowMs = now.getTime();
  const daysSinceWB =
    lastWbDate > 0 ? Math.floor((nowMs - lastWbDate) / 86_400_000) : Infinity;
  const recentRedaction = monthActivity
    .slice(Math.max(0, todayNum - 7), todayNum)
    .some((d) => d.wordsDisplay > 0);
  const showWBNudge = recentRedaction && daysSinceWB > 7;

  let streak = 0;
  for (let d = todayNum; d >= 1; d--) {
    if (monthActivity[d - 1].wordsDisplay > 0) streak++;
    else break;
  }

  const monthWordsTotal = monthActivity.reduce((s, d) => s + d.words, 0);
  const expectedSoFar = DAILY_GOAL * todayNum;
  const monthExpectedTotal = DAILY_GOAL * daysInMonth;
  const monthRatio = monthExpectedTotal > 0 ? monthWordsTotal / monthExpectedTotal : 0;
  const monthPct = Math.round(monthRatio * 100);
  const onTrackRatio = expectedSoFar > 0 ? monthWordsTotal / expectedSoFar : 0;

  const activeGoal = (activeNovel as { word_goal?: number | null } | undefined)?.word_goal ?? 0;
  const activeWords = (activeNovel as { current_words?: number } | undefined)?.current_words ?? 0;
  const remainingWords = Math.max(0, activeGoal - activeWords);
  const realDailyPace = todayNum > 0 ? monthWordsTotal / todayNum : 0;
  const etaDays = realDailyPace > 0 ? Math.ceil(remainingWords / realDailyPace) : 0;
  const etaDate = etaDays > 0 ? new Date(nowMs + etaDays * 86_400_000) : null;
  const paceDelta = realDailyPace - DAILY_GOAL;
  const paceVerdict =
    activeGoal === 0
      ? null
      : realDailyPace <= 0
        ? "noData"
        : paceDelta >= 0
          ? "ahead"
          : paceDelta > -DAILY_GOAL * 0.3
            ? "onTrack"
            : "behind";

  const lastProject = lastNovel
    ? projects?.find(p => p.id === lastNovel.project_id)
    : null;

  const lastChapter = lastNovel?.chapters
    ?.sort((a: { updated_at: string }, b: { updated_at: string }) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0] ?? null;

  const monthName = now.toLocaleDateString("fr-FR", { month: "long" });

  // Week this month : how many words written during current calendar week so far
  const weekStart = todayNum - ((now.getDay() + 6) % 7);
  const weekWords = monthActivity
    .filter((d) => d.day >= Math.max(1, weekStart) && d.day <= todayNum)
    .reduce((s, d) => s + d.wordsDisplay, 0);

  // Novels split by status (rédaction / réécriture / relecture…) — light summary
  const novelsRedac = allNovels.filter((n: { status?: string }) =>
    n.status === "en_cours" || n.status === "redaction" || !n.status
  ).length;
  const novelsReecr = allNovels.filter((n: { status?: string }) =>
    n.status === "reecriture" || n.status === "relecture"
  ).length;

  // Total WB entries across projects (as the caption "+N fiches univers" uses it)
  const { count: wbCount } = await supabase
    .from("wb_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="px-6 py-5 max-w-[1280px] mx-auto">
      {showWBNudge && <WBNudge daysSinceWB={daysSinceWB} />}
      {milestoneAlerts.length > 0 && <MilestoneAlerts items={milestoneAlerts} />}

      {/* === Hero banner === */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.06] hero-glow p-5 mb-5 flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-[var(--radius-md)] bg-[var(--color-primary-bg)] border border-[var(--color-primary-border)] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20L14 10M14 10L18 6C19 5 20.5 5 21.5 6C22.5 7 22.5 8.5 21.5 9.5L17.5 13.5M14 10L17.5 13.5M17.5 13.5L10 21H4V15"
              stroke="var(--color-accent)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] text-text-primary leading-tight">
            <span>Reprenez votre histoire</span>{" "}
            <span className="font-serif italic text-[var(--color-accent)]">
              là où votre plume s&apos;est posée.
            </span>
          </div>
          {lastChapter && lastNovel ? (
            <div className="text-[12px] text-text-tertiary mt-1">
              {lastChapter.title} · <span className="font-serif italic text-text-secondary">{lastNovel.title}</span>
              {" · "}modifié {relativeTime(lastChapter.updated_at)}
            </div>
          ) : (
            <div className="text-[12px] text-text-tertiary mt-1">
              {projects && projects.length > 0
                ? "Continuez votre histoire là où vous l'avez laissée."
                : "Créez votre premier projet pour commencer à écrire."}
            </div>
          )}
        </div>
        {lastNovel && (
          <a
            href={`/editor/${lastNovel.id}`}
            className="shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[13px] transition-colors no-underline"
          >
            Reprendre l&apos;écriture
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>

      {/* === Stats row === */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Mots écrits"
          value={totalWords.toLocaleString("fr-FR")}
          caption={weekWords > 0 ? `▲ + ${weekWords.toLocaleString("fr-FR")} cette semaine` : "— cette semaine"}
        />
        <StatCard
          label="Romans"
          value={String(allNovels.length)}
          caption={`${novelsRedac} rédaction · ${novelsReecr} réécriture`}
        />
        <StatCard
          label="Projets actifs"
          value={String(projects?.length ?? 0)}
          caption={`+ ${wbCount ?? 0} fiches univers`}
        />
        <StatCard
          label="XP · Scribouillard"
          value="0"
          valueSuffix="/ 500"
          caption="◆ Niveau 1"
        />
      </div>

      {/* === Split layout: Objectif du mois / Vos univers === */}
      <div className="grid grid-cols-12 gap-4">
        {/* Objectif du mois */}
        <div className="col-span-8 rounded-[var(--radius-xl)] border border-white/[0.06] bg-bg-tertiary/50 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] font-medium text-text-quaternary uppercase mb-1" style={{ letterSpacing: "0.18em" }}>
                Objectif du mois
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-[20px] text-text-primary capitalize">
                  {monthName}
                </div>
                <div className="font-serif italic text-[20px] text-[var(--color-accent)]">
                  {year}
                </div>
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5">
                Objectif quotidien · {DAILY_GOAL.toLocaleString("fr-FR")} mots
              </div>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent-border)] text-[11px] text-[var(--color-accent)]">
                🔥 <span>{streak} jour{streak > 1 ? "s" : ""} d&apos;affilée</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="text-text-tertiary">
                Ce mois · <span className="text-text-secondary">{monthWordsTotal.toLocaleString("fr-FR")}</span>
                <span className="text-text-quaternary"> / {monthExpectedTotal.toLocaleString("fr-FR")} attendus</span>
              </div>
              <div className="text-[var(--color-accent)] font-medium">{monthPct} %</div>
            </div>
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${Math.min(100, monthPct)}%` }}
              />
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-3 pb-3 mb-3 border-b border-white/[0.05]">
            <Metric
              label="Fin estimée"
              value={
                etaDate
                  ? etaDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                  : "—"
              }
              accent={paceVerdict === "behind"}
            />
            <Metric
              label="Rythme"
              value={realDailyPace > 0 ? `${Math.round(realDailyPace).toLocaleString("fr-FR")}` : "—"}
              suffix="mots/j"
            />
            <Metric
              label="Restant"
              value={remainingWords > 0 ? remainingWords.toLocaleString("fr-FR") : "—"}
            />
            <div>
              <div className="text-[10px] font-medium text-text-quaternary uppercase mb-1.5" style={{ letterSpacing: "0.16em" }}>
                Statut
              </div>
              <PaceChip verdict={paceVerdict} onTrack={onTrackRatio} />
            </div>
          </div>

          {/* Calendrier */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-serif italic text-[13px] text-text-secondary">Activité du mois</div>
              <div className="flex items-center gap-3 text-[10px] text-text-quaternary">
                <LegendDot color="#7F77DD" label="Rédaction" />
                <LegendDot color="#5DCAA5" label="Worldbuilding" />
                <LegendDot color="#EF9F27" label="Planif." />
                <span className="flex items-center gap-1">
                  <span className="text-[var(--color-accent)]">◆</span>
                  Jalons
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["L","M","M","J","V","S","D"].map((d, i) => (
                <div key={i} className="text-[10px] text-text-quaternary text-center font-serif italic">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }, (_, i) => (
                <div key={`empty-${i}`} className="h-14 rounded-[var(--radius-sm)]" />
              ))}
              {monthActivity.map((d) => {
                const bands = [
                  d.ratio > 0 && { color: "#7F77DD", op: 0.25 + d.ratio * 0.65 },
                  d.wbIntensity > 0 && { color: "#5DCAA5", op: 0.25 + d.wbIntensity * 0.65 },
                  d.planIntensity > 0 && { color: "#EF9F27", op: 0.25 + d.planIntensity * 0.65 },
                ].filter(Boolean) as { color: string; op: number }[];

                const milestoneLines = d.milestones.map((m) => {
                  const typeLabel = m.type === "custom" ? "◆" : `◆ ${m.type}`;
                  const statusMark =
                    m.status === "done" ? "✓ " : m.status === "in_progress" ? "◐ " : "";
                  return `${typeLabel} ${statusMark}${m.title}`;
                });
                const baseTooltip = d.isFuture
                  ? [`${d.day}`]
                  : [
                      `${d.day}`,
                      d.wordsDisplay > 0 ? `✎ ${d.wordsDisplay.toLocaleString("fr-FR")} mots` : null,
                      d.wbCount > 0 ? `◐ ${d.wbCount} fiche${d.wbCount > 1 ? "s" : ""} WB` : null,
                      d.planCount > 0 ? `▦ ${d.planCount} élément${d.planCount > 1 ? "s" : ""} planif` : null,
                    ].filter(Boolean) as string[];
                const tooltip = [
                  baseTooltip.join(" · "),
                  ...milestoneLines,
                ].join("\n");

                return (
                  <div
                    key={d.day}
                    title={tooltip}
                    className={`relative h-14 rounded-[var(--radius-sm)] border border-white/[0.04] overflow-hidden ${
                      d.isFuture
                        ? "bg-white/[0.015]"
                        : d.isToday
                          ? "bg-[var(--color-accent-bg)]/40 ring-1 ring-[var(--color-accent-border)]"
                          : "bg-white/[0.025]"
                    } ${d.milestones.length > 0 ? "ring-1 ring-[var(--color-accent-border)]/60" : ""}`}
                  >
                    {/* Bars en haut de la cellule */}
                    {!d.isFuture && bands.length > 0 && (
                      <div className="absolute inset-x-1 top-1 flex gap-[2px]">
                        {bands.map((b, i) => (
                          <span
                            key={i}
                            className="h-[2px] flex-1 rounded-full"
                            style={{ background: b.color, opacity: b.op }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Numéro du jour — haut à droite */}
                    <span
                      className={`absolute top-1 right-1.5 text-[10px] ${
                        d.isToday
                          ? "font-medium text-[var(--color-accent)]"
                          : d.isFuture
                            ? "text-text-quaternary/60"
                            : "text-text-quaternary"
                      }`}
                    >
                      {d.day}
                    </span>

                    {/* Milestones — libellés empilés en bas de la cellule */}
                    {d.milestones.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-[1px] pointer-events-none">
                        {d.milestones.length > 2 && (
                          <div className="text-[7.5px] leading-none text-text-quaternary pl-[7px]">
                            +{d.milestones.length - 2} autre{d.milestones.length - 2 > 1 ? "s" : ""}
                          </div>
                        )}
                        {d.milestones.slice(0, 2).map((m) => {
                          const color = milestoneColor(m.type, m.color);
                          const op =
                            m.status === "done"
                              ? 1
                              : m.status === "in_progress"
                                ? 0.85
                                : 0.6;
                          return (
                            <div
                              key={m.id}
                              className="flex items-center gap-1 truncate"
                              style={{ opacity: op }}
                            >
                              <span
                                className="shrink-0 w-[5px] h-[5px] rounded-[1px]"
                                style={{ background: color }}
                              />
                              <span
                                className="text-[8.5px] leading-[1.1] truncate"
                                style={{
                                  color,
                                  textDecoration:
                                    m.status === "done" ? "line-through" : "none",
                                }}
                                title={m.title}
                              >
                                {m.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Vos univers */}
        <div className="col-span-4">
          <DashboardClient
            projects={projects ?? []}
            lastProjectTitle={lastProject?.title}
          />
        </div>
      </div>
    </div>
  );
}

/* ========== Sub-components ========== */

function StatCard({
  label,
  value,
  valueSuffix,
  caption,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
  caption: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.06] bg-bg-tertiary/50 p-3.5">
      <div className="text-[10px] font-medium text-text-quaternary uppercase mb-2" style={{ letterSpacing: "0.18em" }}>
        {label}
      </div>
      <div className="text-[28px] leading-none font-light text-text-primary mb-2">
        {value}
        {valueSuffix && (
          <span className="text-[14px] text-text-quaternary ml-1">{valueSuffix}</span>
        )}
      </div>
      <div className="text-[11px] text-text-tertiary">{caption}</div>
      <div
        className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(228,180,140,0.12) 0%, transparent 70%)" }}
      />
    </div>
  );
}

function Metric({ label, value, suffix, accent }: { label: string; value: string; suffix?: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-medium text-text-quaternary uppercase mb-1.5" style={{ letterSpacing: "0.16em" }}>
        {label}
      </div>
      <div className={`text-[15px] ${accent ? "text-[var(--color-accent)]" : "text-text-primary"} leading-none`}>
        {value}
        {suffix && <span className="text-[11px] text-text-quaternary ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function PaceChip({ verdict, onTrack }: { verdict: string | null; onTrack: number }) {
  if (verdict === "ahead") {
    return (
      <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] bg-teal-bg border border-teal-border text-teal">
        ✓ en avance
      </span>
    );
  }
  if (verdict === "behind") {
    return (
      <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] bg-amber-bg border border-amber/30 text-amber">
        ⚠ En retard
      </span>
    );
  }
  if (verdict === "onTrack") {
    return (
      <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] bg-white/[0.04] border border-white/[0.08] text-text-secondary">
        ≈ dans les temps
      </span>
    );
  }
  const pct = Math.round(onTrack * 100);
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] bg-white/[0.04] border border-white/[0.08] text-text-tertiary">
      {pct > 0 ? `${pct} %` : "—"}
    </span>
  );
}

function milestoneColor(type: string, color: string | null): string {
  if (color && /^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  switch (type) {
    case "plan":       return "#7B6FDE";
    case "beta":       return "#5DCAA5";
    case "salon":      return "#e4b48c";
    case "soumission": return "#EF9F27";
    default:           return "#a89e8d";
  }
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-[2px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} jour${days > 1 ? "s" : ""}`;
}
