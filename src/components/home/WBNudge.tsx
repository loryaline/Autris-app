"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "autris.wb_nudge.dismissed_week";

function currentWeekKey(): string {
  const d = new Date();
  // ISO week number (YYYY-Www)
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function WBNudge({ daysSinceWB }: { daysSinceWB: number }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === currentWeekKey());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, currentWeekKey());
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="mb-3 p-3 rounded-[var(--radius-md)] bg-teal/10 border border-teal/30 flex items-start gap-2.5">
      <span className="text-[var(--color-accent)] text-[13px] leading-none pt-1">◆</span>
      <div className="flex-1">
        <div className="text-[12px] text-text-primary leading-snug">
          Vous n&apos;êtes pas repassé par votre{" "}
          <span className="font-serif italic text-[var(--color-accent)]">univers</span> depuis{" "}
          <span className="font-medium">
            {daysSinceWB === Infinity ? "longtemps" : `${daysSinceWB} jours`}
          </span>
          . Une fiche à compléter, un détail à fixer avant qu&apos;il ne s&apos;échappe&nbsp;?
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-[11px] text-text-tertiary hover:text-text-primary px-1.5 py-0.5 cursor-pointer"
        title="Fermer jusqu'à la semaine prochaine"
      >
        ✕
      </button>
    </div>
  );
}
