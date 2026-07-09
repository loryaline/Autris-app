"use client";

import { useState } from "react";

/* ===== Types ===== */
interface DayMilestone {
  id: string;
  title: string;
  type: string;
  status: string;
  color: string | null;
}
export interface DayActivity {
  day: number;
  words: number;
  wordsDisplay: number;
  wbCount: number;
  planCount: number;
  ratio: number;
  wbIntensity: number;
  planIntensity: number;
  isFuture: boolean;
  isToday: boolean;
  milestones: DayMilestone[];
}

interface GoalCardProps {
  monthActivity: DayActivity[];
  startOffset: number;
  monthIndex: number;
  todayNum: number;
  activeNovelTitle: string | null;
  activeNovelExists: boolean;
  activeNovelGoalReached: boolean;
  dailyGoal: number;
  streak: number;
  daysSinceActivation: number;
  wordsSinceActivation: number;
  expectedSinceActivation: number;
  periodPct: number;
  etaLabel: string | null;
  realDailyPace: number;
  remainingWords: number;
  paceVerdict: string | null;
  activationDateLabel: string | null;
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const FULL_WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const C_REDAC = "#7B6FDE";

/** Couleur d'un jalon — code hex explicite sinon couleur par type. */
function milestoneColor(type: string, color: string | null): string {
  if (color && /^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  switch (type) {
    case "plan": return C_REDAC;
    case "beta": return "var(--secondary)";
    case "salon": return "var(--accent)";
    case "soumission": return "var(--tertiary)";
    default: return "var(--text-3)";
  }
}

export function GoalCard(props: GoalCardProps) {
  const {
    monthActivity, startOffset, monthIndex, todayNum,
    activeNovelTitle, activeNovelExists, activeNovelGoalReached,
    dailyGoal, streak,
    wordsSinceActivation, expectedSinceActivation, periodPct,
    etaLabel, realDailyPace, remainingWords, paceVerdict,
    activationDateLabel,
  } = props;

  const [selectedDay, setSelectedDay] = useState(todayNum);
  const sel = monthActivity[selectedDay - 1] ?? null;

  /* ===== Agrégats mensuels ===== */
  const past = monthActivity.filter((d) => !d.isFuture);
  const totalWords = past.reduce((s, d) => s + d.wordsDisplay, 0);
  const totalWb = past.reduce((s, d) => s + d.wbCount, 0);
  const totalPlan = past.reduce((s, d) => s + d.planCount, 0);
  const activeDays = past.filter(
    (d) => d.wordsDisplay > 0 || d.wbCount > 0 || d.planCount > 0,
  ).length;
  const bestDay = past.reduce<DayActivity | null>(
    (b, d) => (!b || d.wordsDisplay > b.wordsDisplay ? d : b),
    null,
  );

  /** Jour de la semaine (0 = lundi) pour le jour `d` du mois. */
  function dayOfWeek(d: number): number {
    return (startOffset + d - 1) % 7;
  }

  /* Activité dominante du mois (rédaction / WB / planif), pondérée. */
  const wRedac = totalWords;
  const wWb = totalWb * 200;
  const wPlan = totalPlan * 200;
  const wSum = wRedac + wWb + wPlan;
  const dominant =
    wSum === 0
      ? null
      : wRedac >= wWb && wRedac >= wPlan
        ? { label: "Rédaction", color: C_REDAC, pct: Math.round((wRedac / wSum) * 100) }
        : wWb >= wPlan
          ? { label: "Worldbuilding", color: "var(--secondary)", pct: Math.round((wWb / wSum) * 100) }
          : { label: "Planification", color: "var(--tertiary)", pct: Math.round((wPlan / wSum) * 100) };

  return (
    <div className="rd-goal-card rd-fade-in">
      {/* En-tête */}
      <div className="rd-goal-head">
        <div>
          <div className="rd-eyebrow" style={{ marginBottom: 6 }}>
            Roman actif
          </div>
          <div className="rd-goal-month">
            {activeNovelTitle ? <em>{activeNovelTitle}</em> : "Aucun roman actif"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
            Objectif quotidien · {dailyGoal.toLocaleString("fr-FR")} mots
            {activationDateLabel && (
              <> · actif depuis le {activationDateLabel}</>
            )}
          </div>
        </div>
        {streak > 0 && (
          <div className="rd-streak-pill">
            🔥 {streak} jour{streak > 1 ? "s" : ""} d&apos;affilée
          </div>
        )}
      </div>

      {/* Progression depuis activation */}
      {activeNovelExists && !activeNovelGoalReached && (
        <>
          <div className="rd-progress-row">
            <span style={{ color: "var(--text-3)" }}>
              Depuis l&apos;activation ·{" "}
              <span style={{ color: "var(--text-2)" }}>
                {wordsSinceActivation.toLocaleString("fr-FR")}
              </span>
              <span style={{ color: "var(--text-4)" }}>
                {" "}/ {expectedSinceActivation.toLocaleString("fr-FR")} attendus
              </span>
            </span>
            <span className="pct">{periodPct}%</span>
          </div>
          <div className="rd-progress-bar">
            <div
              className="rd-progress-fill"
              style={{ width: `${Math.min(100, periodPct)}%` }}
            />
          </div>
        </>
      )}

      {/* Métriques d'estimation */}
      <div className="rd-metrics-row">
        <div>
          <div className="rd-metric-label">Fin estimée</div>
          <div className="rd-metric-value">{etaLabel ?? "—"}</div>
        </div>
        <div>
          <div className="rd-metric-label">Rythme</div>
          <div className="rd-metric-value">
            {realDailyPace > 0 ? Math.round(realDailyPace).toLocaleString("fr-FR") : "—"}
            {realDailyPace > 0 && <span className="small">mots/j</span>}
          </div>
        </div>
        <div>
          <div className="rd-metric-label">Restant</div>
          <div className="rd-metric-value">
            {remainingWords > 0 ? remainingWords.toLocaleString("fr-FR") : "—"}
          </div>
        </div>
        <div>
          <div className="rd-metric-label">Statut</div>
          {activeNovelGoalReached ? (
            <span className="rd-chip rd-chip-success">✓ objectif atteint</span>
          ) : paceVerdict === "ahead" ? (
            <span className="rd-chip rd-chip-success">✓ en avance</span>
          ) : paceVerdict === "behind" ? (
            <span className="rd-chip rd-chip-danger">⚠ en retard</span>
          ) : paceVerdict === "onTrack" ? (
            <span className="rd-chip">≈ dans les temps</span>
          ) : (
            <span className="rd-chip">— en mesure</span>
          )}
        </div>
      </div>

      {/* Calendrier — en-tête */}
      <div className="rd-cal-head">
        <div>
          <div className="rd-cal-title">Activité du mois</div>
          <div className="rd-cal-sub">
            <span><strong>{activeDays}</strong> jours actifs</span>
            <span className="dot-sep">·</span>
            <span><strong>{totalWords.toLocaleString("fr-FR")}</strong> mots</span>
            <span className="dot-sep">·</span>
            <span><strong>{totalWb}</strong> fiches univers</span>
            <span className="dot-sep">·</span>
            <span><strong>{totalPlan}</strong> éléments planif</span>
          </div>
        </div>
        <div className="rd-legend">
          <span className="rd-legend-dot" style={{ "--swatch": C_REDAC } as React.CSSProperties}>Rédaction</span>
          <span className="rd-legend-dot" style={{ "--swatch": "var(--secondary)" } as React.CSSProperties}>Worldbuilding</span>
          <span className="rd-legend-dot" style={{ "--swatch": "var(--tertiary)" } as React.CSSProperties}>Planif.</span>
        </div>
      </div>

      {/* Grille — en-têtes jours */}
      <div className="rd-cal-grid-head">
        {WEEKDAYS.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {/* Grille — cellules */}
      <div className="rd-cal-grid">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e${i}`} className="rd-cal-cell empty" />
        ))}
        {monthActivity.map((d) => {
          const hasActivity = d.wordsDisplay > 0 || d.wbCount > 0 || d.planCount > 0;
          const dots = [
            d.ratio > 0 && { c: C_REDAC, o: 0.3 + d.ratio * 0.6 },
            d.wbIntensity > 0 && { c: "var(--secondary)", o: 0.3 + d.wbIntensity * 0.6 },
            d.planIntensity > 0 && { c: "var(--tertiary)", o: 0.3 + d.planIntensity * 0.6 },
          ].filter(Boolean) as { c: string; o: number }[];
          const isSelected = selectedDay === d.day;
          const firstMilestone = d.milestones[0] ?? null;
          return (
            <button
              key={d.day}
              type="button"
              disabled={d.isFuture}
              onClick={() => !d.isFuture && setSelectedDay(d.day)}
              className={
                "rd-cal-cell" +
                (d.isToday ? " today" : "") +
                (d.isFuture ? " future" : "") +
                (isSelected ? " selected" : "") +
                (hasActivity ? " has-activity" : "")
              }
              style={
                hasActivity && !d.isFuture
                  ? {
                      background: `linear-gradient(135deg, color-mix(in oklab, ${C_REDAC} ${d.ratio * 14}%, transparent), color-mix(in oklab, var(--secondary) ${d.wbIntensity * 14}%, transparent))`,
                    }
                  : undefined
              }
            >
              <span className="rd-cal-day">{d.day}</span>
              {!d.isFuture && d.wordsDisplay > 0 && (
                <span className="rd-cal-words">{d.wordsDisplay}</span>
              )}
              {dots.length > 0 && (
                <div className="rd-cal-dots">
                  {dots.map((b, i) => (
                    <span key={i} className="rd-cal-dot" style={{ background: b.c, opacity: b.o }} />
                  ))}
                </div>
              )}
              {firstMilestone && (
                <div className="rd-cal-milestone">
                  <span
                    className="rd-cal-milestone-dot"
                    style={{ background: milestoneColor(firstMilestone.type, firstMilestone.color) }}
                  />
                  <span
                    style={{
                      color: milestoneColor(firstMilestone.type, firstMilestone.color),
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {firstMilestone.title}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Détail du jour sélectionné */}
      {sel && (
        <div
          className={
            "rd-cal-detail" +
            (sel.wordsDisplay || sel.wbCount || sel.planCount ? "" : " empty")
          }
        >
          <div className="rd-cal-detail-head">
            <div>
              <div className="rd-cal-detail-eyebrow">
                {sel.isToday ? "Aujourd'hui" : sel.isFuture ? "À venir" : "Journée"}
              </div>
              <div className="rd-cal-detail-date">
                <span className="serif">{FULL_WEEKDAYS[dayOfWeek(sel.day)]}</span> {sel.day} {MONTHS[monthIndex]}
              </div>
            </div>
            {sel.milestones.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: milestoneColor(sel.milestones[0].type, sel.milestones[0].color),
                }}
              >
                ◆ {sel.milestones[0].title}
                {sel.milestones.length > 1 && ` +${sel.milestones.length - 1}`}
              </span>
            )}
          </div>

          {sel.isFuture ? (
            <div className="rd-cal-detail-empty">— pas encore là —</div>
          ) : sel.wordsDisplay === 0 && sel.wbCount === 0 && sel.planCount === 0 ? (
            <div className="rd-cal-detail-empty">Journée sans activité enregistrée.</div>
          ) : (
            <div className="rd-cal-detail-grid">
              {sel.wordsDisplay > 0 && (
                <div className="rd-cal-detail-row" style={{ "--c": C_REDAC } as React.CSSProperties}>
                  <span className="rd-cal-detail-icon">✎</span>
                  <span className="rd-cal-detail-body">
                    <span className="rd-cal-detail-num">{sel.wordsDisplay.toLocaleString("fr-FR")}</span>
                    <span className="rd-cal-detail-cat">mots écrits</span>
                  </span>
                </div>
              )}
              {sel.wbCount > 0 && (
                <div className="rd-cal-detail-row" style={{ "--c": "var(--secondary)" } as React.CSSProperties}>
                  <span className="rd-cal-detail-icon">◆</span>
                  <span className="rd-cal-detail-body">
                    <span className="rd-cal-detail-num">{sel.wbCount}</span>
                    <span className="rd-cal-detail-cat">
                      fiche{sel.wbCount > 1 ? "s" : ""} univers modifiée{sel.wbCount > 1 ? "s" : ""}
                    </span>
                  </span>
                </div>
              )}
              {sel.planCount > 0 && (
                <div className="rd-cal-detail-row" style={{ "--c": "var(--tertiary)" } as React.CSSProperties}>
                  <span className="rd-cal-detail-icon">▦</span>
                  <span className="rd-cal-detail-body">
                    <span className="rd-cal-detail-num">{sel.planCount}</span>
                    <span className="rd-cal-detail-cat">
                      élément{sel.planCount > 1 ? "s" : ""} de planification
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Faits marquants du mois */}
      {bestDay && bestDay.wordsDisplay > 0 && (
        <div className="rd-cal-highlights">
          <div className="rd-cal-highlight">
            <span className="rd-cal-highlight-label">Meilleur jour</span>
            <span className="rd-cal-highlight-value">
              <strong>{bestDay.wordsDisplay.toLocaleString("fr-FR")}</strong>
              <span> mots · {bestDay.day} {MONTHS[monthIndex]}</span>
            </span>
          </div>
          <div className="rd-cal-highlight">
            <span className="rd-cal-highlight-label">Moyenne / jour actif</span>
            <span className="rd-cal-highlight-value">
              <strong>
                {activeDays > 0 ? Math.round(totalWords / activeDays).toLocaleString("fr-FR") : "—"}
              </strong>
              <span> mots</span>
            </span>
          </div>
          <div className="rd-cal-highlight">
            <span className="rd-cal-highlight-label">Activité dominante</span>
            <span className="rd-cal-highlight-value">
              {dominant ? (
                <>
                  <strong style={{ color: dominant.color }}>{dominant.label}</strong>
                  <span> · {dominant.pct}%</span>
                </>
              ) : (
                <strong>—</strong>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
