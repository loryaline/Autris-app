"use client";

import { useEffect, useMemo, useState } from "react";

export interface MilestoneAlertItem {
  id: string;
  title: string;
  type: string;
  status: string;
  color: string | null;
  targetDate: string; // YYYY-MM-DD
  daysDelta: number; // négatif = en retard, 0 = aujourd'hui, positif = à venir
  novelId: string | null;
  novelTitle: string | null;
}

const STORAGE_KEY = "autris.milestone_alerts.dismissed_day";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const TYPE_ICON: Record<string, string> = {
  plan: "▦",
  beta: "◐",
  salon: "✦",
  soumission: "✉",
  custom: "◆",
};

const TYPE_LABEL: Record<string, string> = {
  plan: "Plan",
  beta: "Bêta",
  salon: "Salon",
  soumission: "Soumission",
  custom: "Date butoir",
};

function milestoneColor(type: string, color: string | null): string {
  if (color && /^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  switch (type) {
    case "plan": return "#7B6FDE";
    case "beta": return "#5DCAA5";
    case "salon": return "#e4b48c";
    case "soumission": return "#EF9F27";
    default: return "#a89e8d";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function relativeLabel(daysDelta: number): string {
  if (daysDelta < 0) {
    const abs = Math.abs(daysDelta);
    return abs === 1 ? "hier" : `il y a ${abs} j`;
  }
  if (daysDelta === 0) return "aujourd'hui";
  if (daysDelta === 1) return "demain";
  return `dans ${daysDelta} j`;
}

export function MilestoneAlerts({ items }: { items: MilestoneAlertItem[] }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Défère le setState hors de la phase synchrone de l'effet pour respecter
    // react-hooks/set-state-in-effect (sinon → re-render cascadé).
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === todayKey());
    });
    return () => { cancelled = true; };
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, todayKey());
    setDismissed(true);
  }

  const { overdue, today, soon } = useMemo(() => {
    const overdue: MilestoneAlertItem[] = [];
    const today: MilestoneAlertItem[] = [];
    const soon: MilestoneAlertItem[] = [];
    for (const m of items) {
      if (m.daysDelta < 0) overdue.push(m);
      else if (m.daysDelta === 0) today.push(m);
      else soon.push(m);
    }
    return { overdue, today, soon };
  }, [items]);

  if (dismissed || items.length === 0) return null;

  // Tonalité de la bannière : si au moins un jalon dépassé → ambre, sinon
  // accent doux. On veut alerter sans crier.
  const hasOverdue = overdue.length > 0;
  const accentBg = hasOverdue
    ? "bg-amber/10 border-amber/30"
    : "bg-[var(--color-accent-bg)]/60 border-[var(--color-accent-border)]";
  const titleText = hasOverdue
    ? "Dates butoirs à rattraper"
    : today.length > 0
      ? "Une date butoir, aujourd'hui"
      : "Date butoir en approche";

  const summaryParts = [
    overdue.length > 0 && `${overdue.length} en retard`,
    today.length > 0 && `${today.length} aujourd'hui`,
    soon.length > 0 && `${soon.length} à venir`,
  ].filter(Boolean) as string[];

  return (
    <div className={`mb-3 p-3 rounded-[var(--radius-md)] border ${accentBg}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-[15px] leading-none pt-0.5">
          {hasOverdue ? "⚠" : "◆"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="text-[12px] text-text-primary font-medium">
              {titleText}
            </div>
            <div className="text-[10.5px] text-text-tertiary">
              {summaryParts.join(" · ")}
            </div>
          </div>

          <ul className="flex flex-col gap-1">
            {[...overdue, ...today, ...soon].slice(0, 6).map((m) => {
              const color = milestoneColor(m.type, m.color);
              const icon = TYPE_ICON[m.type] ?? "◆";
              const typeLabel = TYPE_LABEL[m.type] ?? "Date butoir";
              const isOverdue = m.daysDelta < 0;
              const isToday = m.daysDelta === 0;
              const href = m.novelId ? `/planning/${m.novelId}` : null;
              const rowContent = (
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 text-[10px] leading-none"
                    style={{ color }}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <span className="text-[11.5px] text-text-primary truncate">
                    {m.title || <span className="italic text-text-quaternary">Sans titre</span>}
                  </span>
                  {m.novelTitle && (
                    <span className="text-[10.5px] text-text-quaternary truncate font-serif italic">
                      · {m.novelTitle}
                    </span>
                  )}
                  <span
                    className="shrink-0 ml-auto inline-flex items-center gap-1 h-5 pl-1.5 pr-2 rounded-full text-[10px]"
                    style={{
                      background: isOverdue
                        ? "rgba(239,159,39,0.12)"
                        : isToday
                          ? "var(--color-accent-bg)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        isOverdue
                          ? "rgba(239,159,39,0.32)"
                          : isToday
                            ? "var(--color-accent-border)"
                            : "rgba(255,255,255,0.08)"
                      }`,
                      color: isOverdue
                        ? "#f0b254"
                        : isToday
                          ? "var(--color-accent)"
                          : "var(--color-text-tertiary)",
                    }}
                  >
                    <span className="font-serif italic">{typeLabel}</span>
                    <span className="text-text-quaternary/80">·</span>
                    <span>{formatDate(m.targetDate)}</span>
                    <span className="text-text-quaternary/80">·</span>
                    <span>{relativeLabel(m.daysDelta)}</span>
                  </span>
                </span>
              );
              return (
                <li key={m.id}>
                  {href ? (
                    <a
                      href={href}
                      className="flex items-center px-1.5 py-1 rounded-[var(--radius-sm)] hover:bg-white/[0.04] transition-colors no-underline"
                    >
                      {rowContent}
                    </a>
                  ) : (
                    <div className="flex items-center px-1.5 py-1">{rowContent}</div>
                  )}
                </li>
              );
            })}
            {items.length > 6 && (
              <li className="px-1.5 text-[10.5px] text-text-tertiary italic">
                + {items.length - 6} autre{items.length - 6 > 1 ? "s" : ""}…
              </li>
            )}
          </ul>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[11px] text-text-tertiary hover:text-text-primary px-1.5 py-0.5 cursor-pointer bg-transparent border-none"
          title="Fermer pour aujourd'hui" aria-label="Fermer pour aujourd'hui"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
