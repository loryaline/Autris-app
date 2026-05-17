import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { GoalCard } from "./goal-card";
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

  const nowForQuery = new Date();
  const monthStartIso = new Date(nowForQuery.getFullYear(), nowForQuery.getMonth(), 1)
    .toISOString().slice(0, 10);
  const monthEndIso = new Date(nowForQuery.getFullYear(), nowForQuery.getMonth() + 1, 0)
    .toISOString().slice(0, 10);
  const todayIso = nowForQuery.toISOString().slice(0, 10);
  const soonIso = (() => {
    const d = new Date(nowForQuery);
    d.setDate(d.getDate() + MILESTONE_SOON_DAYS);
    return d.toISOString().slice(0, 10);
  })();
  const weekStartIso = (() => {
    const d = new Date(nowForQuery);
    const offset = (d.getDay() + 6) % 7; // lundi = 0
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  })();
  const todayForWeekIso = todayIso;

  // === Toutes les requêtes en parallèle ===
  // Avant : 7 awaits séquentiels (somme des latences, ~1-2 s sur Supabase).
  // Maintenant : Promise.all → max des latences (~150-300 ms).
  // On a aussi resserré les SELECT (plus de novels(*) ni chapters(...)),
  // et on fetch séparément le dernier chapitre modifié au lieu de tirer
  // tous les chapitres de tous les romans.
  const [
    projectsRes,
    activityRes,
    weekActivityRes,
    lastWbRes,
    milestoneRes,
    alertMilestoneRes,
    wbCountRes,
    lastChapterRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        // Colonnes nécessaires uniquement. Plus de novels(*) qui pulle
        // notes/cover/etc inutiles ni chapters(...) qui pouvait être lourd.
        `id, title, genre, created_at, updated_at, cover_image_url,
         novels (
           id, title, current_words, word_goal, is_active, status,
           activated_at, activation_word_count, project_id, created_at, updated_at
         )`,
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      // Ordre STABLE des romans dans chaque projet : par date de création
      // croissante. Sans ça, Supabase renvoie les romans dans un ordre
      // non garanti — qui changeait visuellement dès qu'on modifiait le
      // statut d'un roman (updated_at modifié → réordonnancement implicite).
      .order("created_at", { referencedTable: "novels", ascending: true }),
    supabase
      .from("daily_activity")
      .select("date, words_written, wb_activity, wb_count, plan_activity, plan_count")
      .eq("user_id", user.id)
      .gte("date", monthStartIso)
      .lte("date", monthEndIso),
    supabase
      .from("daily_activity")
      .select("date, words_written")
      .eq("user_id", user.id)
      .gte("date", weekStartIso)
      .lte("date", todayForWeekIso),
    supabase
      .from("daily_activity")
      .select("date")
      .eq("user_id", user.id)
      .eq("wb_activity", true)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("planning_milestones")
      .select("id, title, type, status, color, target_date")
      .eq("user_id", user.id)
      .not("target_date", "is", null)
      .gte("target_date", monthStartIso)
      .lte("target_date", monthEndIso),
    supabase
      .from("planning_milestones")
      .select("id, title, type, status, color, target_date, novel_id, novels(title)")
      .eq("user_id", user.id)
      .not("target_date", "is", null)
      .neq("status", "done")
      .lte("target_date", soonIso)
      .order("target_date", { ascending: true }),
    supabase
      .from("wb_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    // Dernier chapitre modifié pour le hero « Reprenez votre histoire »
    // — un seul résultat, indépendant du nombre total de chapitres
    // (avant on tirait TOUS les chapitres pour n'en utiliser qu'un).
    supabase
      .from("chapters")
      .select("id, title, updated_at, novel_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const projects = projectsRes.data;
  const activityRows = activityRes.data;
  const weekActivityRows = weekActivityRes.data;
  const lastWbRow = lastWbRes.data;
  const milestoneRows = milestoneRes.data;
  const alertMilestoneRows = alertMilestoneRes.data;
  const wbCount = wbCountRes.count;
  const lastChapterAcrossAll = lastChapterRes.data;

  // Mots écrits totaux (tous romans, tous projets)
  const totalWords = projects?.reduce((sum, p) =>
    sum + ((p as { novels?: { current_words: number }[] }).novels
      ?.reduce((s, n) => s + n.current_words, 0) ?? 0), 0) ?? 0;

  // Mots de la semaine
  const weekWordsTotal = (weekActivityRows ?? []).reduce(
    (s, r) => s + Math.max(0, r.words_written ?? 0),
    0,
  );

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

  const activeGoal = (activeNovel as { word_goal?: number | null } | undefined)?.word_goal ?? 0;
  const activeWords = (activeNovel as { current_words?: number } | undefined)?.current_words ?? 0;
  const remainingWords = Math.max(0, activeGoal - activeWords);
  const activeNovelGoalReached = activeGoal > 0 && activeWords >= activeGoal;
  const activeNovelTitle =
    (activeNovel as { title?: string } | undefined)?.title ?? null;

  // ===== Calculs scopés sur le roman actif depuis sa date d'activation =====
  // Avant : moyenne mensuelle calendaire qui n'avait pas de sens dès qu'on
  // activait un roman en milieu de mois ou qu'on bascule entre romans.
  // Maintenant : on borne la fenêtre de mesure à [activated_at, now()] et on
  // ne compte que les mots écrits SUR le roman actif depuis l'activation.
  const activatedAtRaw = (activeNovel as { activated_at?: string | null } | undefined)?.activated_at ?? null;
  const activationBaseWords = (activeNovel as { activation_word_count?: number | null } | undefined)?.activation_word_count ?? 0;
  const activatedAtDate = activatedAtRaw ? new Date(activatedAtRaw) : null;
  const activatedAtMs = activatedAtDate ? activatedAtDate.getTime() : null;
  // Jours écoulés depuis activation. Min 1 pour éviter div/0 et donner une
  // valeur lisible le jour même de l'activation.
  const daysSinceActivation = activatedAtMs
    ? Math.max(1, Math.ceil((nowMs - activatedAtMs) / 86_400_000))
    : 0;
  // Mots écrits sur le roman actif depuis activation = current_words - base.
  // Clampé à 0 (au cas où l'utilisatrice supprimerait du contenu).
  const wordsSinceActivation = Math.max(0, activeWords - activationBaseWords);
  // Mots attendus sur la même période, basés sur le rythme paramétré.
  const expectedSinceActivation = DAILY_GOAL * daysSinceActivation;
  const periodPct = expectedSinceActivation > 0
    ? Math.round((wordsSinceActivation / expectedSinceActivation) * 100)
    : 0;
  // Rythme réel = mots / jours depuis activation.
  const realDailyPace = daysSinceActivation > 0 ? wordsSinceActivation / daysSinceActivation : 0;
  const etaDays =
    realDailyPace > 0 && remainingWords > 0
      ? Math.ceil(remainingWords / realDailyPace)
      : 0;
  const etaDate = etaDays > 0 ? new Date(nowMs + etaDays * 86_400_000) : null;
  const paceDelta = realDailyPace - DAILY_GOAL;
  const paceVerdict =
    activeGoal === 0 || activeNovelGoalReached
      ? null
      : realDailyPace <= 0
        ? "noData"
        : paceDelta >= 0
          ? "ahead"
          : paceDelta > -DAILY_GOAL * 0.3
            ? "onTrack"
            : "behind";

  // Affichage de la date d'activation, formatée FR.
  const activationDateLabel = activatedAtDate
    ? activatedAtDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Roman correspondant au dernier chapitre modifié (pour le hero
  // « Reprenez votre histoire »). On le résout depuis la liste des romans
  // déjà chargés — pas de requête supplémentaire.
  const lastChapter = lastChapterAcrossAll
    ? {
        title: lastChapterAcrossAll.title,
        updated_at: lastChapterAcrossAll.updated_at,
        novel_id: lastChapterAcrossAll.novel_id,
      }
    : null;
  const lastNovel = lastChapter
    ? allNovels.find((n: { id: string }) => n.id === lastChapter.novel_id) ?? null
    : null;
  const lastProject = lastNovel
    ? projects?.find(p => p.id === (lastNovel as { project_id: string }).project_id)
    : null;

  // Mots de la semaine — calculé plus haut via une requête dédiée qui
  // traverse correctement la frontière entre mois.
  const weekWords = weekWordsTotal;

  // Novels split by status (rédaction / réécriture / relecture…) — light summary
  const novelsRedac = allNovels.filter((n: { status?: string }) =>
    n.status === "en_cours" || n.status === "redaction" || !n.status
  ).length;
  const novelsReecr = allNovels.filter((n: { status?: string }) =>
    n.status === "reecriture" || n.status === "relecture"
  ).length;

  // Jours d'écriture du mois (au moins un mot écrit).
  const writingDaysCount = monthActivity.filter((d) => d.wordsDisplay > 0).length;

  const etaLabel = etaDate
    ? etaDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="rd-page">
      {showWBNudge && <WBNudge daysSinceWB={daysSinceWB} />}
      {milestoneAlerts.length > 0 && <MilestoneAlerts items={milestoneAlerts} />}

      {/* === Hero === */}
      <div className="rd-hero rd-fade-in">
        <div className="rd-hero-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20L14 10M14 10L18 6C19 5 20.5 5 21.5 6C22.5 7 22.5 8.5 21.5 9.5L17.5 13.5M14 10L17.5 13.5M17.5 13.5L10 21H4V15"
              stroke="var(--accent)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="rd-hero-body">
          <div className="rd-hero-title">
            Reprenez votre histoire <em>là où votre plume s&apos;est posée.</em>
          </div>
          {lastChapter && lastNovel ? (
            <div className="rd-hero-sub">
              {lastChapter.title} ·{" "}
              <span className="serif italic" style={{ color: "var(--text-2)" }}>
                {lastNovel.title}
              </span>{" "}
              · modifié {relativeTime(lastChapter.updated_at)}
            </div>
          ) : (
            <div className="rd-hero-sub">
              {projects && projects.length > 0
                ? "Continuez votre histoire là où vous l'avez laissée."
                : "Créez votre premier projet pour commencer à écrire."}
            </div>
          )}
        </div>
        {lastNovel && (
          <a href={`/editor/${lastNovel.id}`} className="rd-btn rd-btn-primary">
            Reprendre l&apos;écriture
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>

      {/* === Statistiques === */}
      <div className="rd-stat-grid">
        <StatCard
          label="Mots écrits"
          value={totalWords.toLocaleString("fr-FR")}
          caption={
            weekWords > 0 ? (
              <>
                <span className="up">▲ + {weekWords.toLocaleString("fr-FR")}</span> cette semaine
              </>
            ) : (
              "— cette semaine"
            )
          }
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
          label="Jours d'écriture"
          value={String(writingDaysCount)}
          suffix="ce mois"
          caption={
            streak > 0
              ? `◆ ${streak} jour${streak > 1 ? "s" : ""} d'affilée`
              : "◆ pas de série en cours"
          }
        />
      </div>

      {/* === Objectif du mois / Vos univers === */}
      <div className="rd-dash-grid">
        <GoalCard
          monthActivity={monthActivity}
          startOffset={startOffset}
          monthIndex={month}
          todayNum={todayNum}
          activeNovelTitle={activeNovelTitle}
          activeNovelExists={!!activeNovel}
          activeNovelGoalReached={activeNovelGoalReached}
          dailyGoal={DAILY_GOAL}
          streak={streak}
          daysSinceActivation={daysSinceActivation}
          wordsSinceActivation={wordsSinceActivation}
          expectedSinceActivation={expectedSinceActivation}
          periodPct={periodPct}
          etaLabel={etaLabel}
          realDailyPace={realDailyPace}
          remainingWords={remainingWords}
          paceVerdict={paceVerdict}
          activationDateLabel={activationDateLabel}
        />
        <div>
          <DashboardClient projects={projects ?? []} lastProjectTitle={lastProject?.title} />
        </div>
      </div>
    </div>
  );
}

/* ========== Sub-components ========== */

function StatCard({
  label,
  value,
  suffix,
  caption,
}: {
  label: string;
  value: string;
  suffix?: string;
  caption: React.ReactNode;
}) {
  return (
    <div className="rd-stat-card rd-fade-in">
      <div className="rd-glint" />
      <div className="rd-stat-label">{label}</div>
      <div className="rd-stat-value">
        {value}
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      <div className="rd-stat-caption">{caption}</div>
    </div>
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
