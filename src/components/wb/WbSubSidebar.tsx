"use client";

import { categoriesForGenre, type WbCategory } from "@/lib/wb-constants";
import type { Genre } from "@/types/database";

/** Vue active : soit une catégorie classique, soit l'accueil (dashboard). */
type ActiveView = "home" | WbCategory;

export function WbSubSidebar({
  genre,
  activeCategory,
  onCategoryChange,
  counts,
}: {
  genre: Genre;
  activeCategory: ActiveView;
  onCategoryChange: (cat: ActiveView) => void;
  counts: Record<string, number>;
}) {
  const cats = categoriesForGenre(genre);
  const grouped = cats.reduce<Record<string, typeof cats>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  const isHomeActive = activeCategory === "home";

  return (
    <div className="w-[220px] shrink-0 border-r border-white/[0.05] bg-bg-secondary/50 px-3 py-4 flex flex-col h-full overflow-y-auto">
      {/* ===== Accueil ===== */}
      <button
        onClick={() => onCategoryChange("home")}
        className={`relative flex items-center gap-2.5 pl-3 pr-2 py-1.5 mb-4 text-[12.5px] rounded-[var(--radius-md)] cursor-pointer transition-colors text-left ${
          isHomeActive
            ? "bg-white/[0.04] text-text-primary"
            : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
        }`}
      >
        {isHomeActive && (
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
            style={{ background: "var(--color-accent)" }}
          />
        )}
        <span className="text-[14px] leading-none">🏠</span>
        <span className="flex-1 truncate">Accueil</span>
      </button>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-5">
          <div
            className="px-2 text-[10px] font-medium text-text-quaternary uppercase mb-2"
            style={{ letterSpacing: "0.18em" }}
          >
            {group}
          </div>
          <div className="flex flex-col gap-0.5">
            {items.map((c) => {
              const isActive = activeCategory === c.key;
              const n = counts[c.key] ?? 0;
              return (
                <button
                  key={c.key}
                  onClick={() => onCategoryChange(c.key)}
                  className={`relative flex items-center gap-2.5 pl-3 pr-2 py-1.5 text-[12.5px] rounded-[var(--radius-md)] cursor-pointer transition-colors text-left ${
                    isActive
                      ? "bg-white/[0.04] text-text-primary"
                      : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                      style={{ background: "var(--color-accent)" }}
                    />
                  )}
                  <span className="text-[14px] leading-none">{c.icon}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  <span
                    className={`text-[10px] leading-none px-1.5 py-1 rounded-full min-w-[18px] text-center ${
                      n > 0
                        ? isActive
                          ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent-border)]"
                          : "bg-white/[0.05] text-text-tertiary border border-white/[0.05]"
                        : "text-text-quaternary/60"
                    }`}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
