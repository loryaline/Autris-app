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
        className={`wb-cat${isHomeActive ? " active" : ""}`}
        style={{ marginBottom: 14 }}
      >
        <span className="wb-cat-icon">🏠</span>
        <span className="wb-cat-label">Accueil</span>
      </button>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-4">
          <div className="wb-cat-group">{group}</div>
          <div className="flex flex-col gap-0.5">
            {items.map((c) => {
              const isActive = activeCategory === c.key;
              const n = counts[c.key] ?? 0;
              return (
                <button
                  key={c.key}
                  onClick={() => onCategoryChange(c.key)}
                  className={`wb-cat${isActive ? " active" : ""}`}
                >
                  <span className="wb-cat-icon">{c.icon}</span>
                  <span className="wb-cat-label">{c.label}</span>
                  <span className="wb-cat-count">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
