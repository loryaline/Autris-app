"use client";

import { useEffect, useState } from "react";
import { categoriesForGenre, type WbCategory } from "@/lib/wb-constants";
import type { Genre } from "@/types/database";

/** Vue active : soit une catégorie classique, soit l'accueil (dashboard). */
type ActiveView = "home" | WbCategory;

export function WbSubSidebar({
  genre,
  activeCategory,
  onCategoryChange,
  counts,
  onOpenBoard,
  boardActive = false,
}: {
  genre: Genre;
  activeCategory: ActiveView;
  onCategoryChange: (cat: ActiveView) => void;
  counts: Record<string, number>;
  /** Ramène au plateau (referme la bibliothèque). */
  onOpenBoard?: () => void;
  /** true quand le plateau occupe l'écran — l'entrée est alors mise en avant. */
  boardActive?: boolean;
}) {
  const cats = categoriesForGenre(genre);
  const grouped = cats.reduce<Record<string, typeof cats>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  const isHomeActive = activeCategory === "home";

  // Repliage de la sous-sidebar WB (partagé via événement).
  const [hidden, setHidden] = useState<boolean | null>(null);
  useEffect(() => {
    let init = false;
    try {
      const stored = localStorage.getItem("autris.wb-sidebar.collapsed");
      if (stored === "1") init = true;
      else if (stored === "0") init = false;
      else if (typeof window !== "undefined" && window.innerWidth < 900) init = true;
    } catch {
      /* localStorage indisponible */
    }
    Promise.resolve().then(() => setHidden(init));

    const onToggle = () => {
      setHidden((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(
            "autris.wb-sidebar.collapsed",
            next ? "1" : "0",
          );
        } catch {
          /* idem */
        }
        return next;
      });
    };
    window.addEventListener("autris:wb-sidebar-toggle", onToggle);
    return () =>
      window.removeEventListener("autris:wb-sidebar-toggle", onToggle);
  }, []);

  if (hidden === null) return null;

  // Cachée → mini bouton pour la ramener.
  if (hidden) {
    return (
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("autris:wb-sidebar-toggle"))
        }
        title="Afficher les catégories"
        aria-label="Afficher les catégories du World Building"
        className="shrink-0 w-8 h-full border-r border-white/[0.05] bg-bg-secondary/40 flex items-start justify-center pt-4 text-text-quaternary hover:text-[var(--color-accent)] hover:bg-bg-secondary cursor-pointer transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M4.5 3L7.5 6L4.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-[220px] shrink-0 border-r border-white/[0.05] bg-bg-secondary/50 px-3 py-4 flex flex-col h-full overflow-y-auto">
      {/* Bouton pour masquer la sous-sidebar */}
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("autris:wb-sidebar-toggle"))
        }
        title="Masquer les catégories"
        aria-label="Masquer les catégories"
        className="self-end w-5 h-5 mb-2 flex items-center justify-center text-text-quaternary hover:text-[var(--color-accent)] cursor-pointer transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M7.5 3L4.5 6L7.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* ===== Plateau — l'accueil du World Building ===== */}
      {onOpenBoard && (
        <button
          onClick={onOpenBoard}
          className={`wb-cat${boardActive ? " active" : ""}`}
          style={{ marginBottom: 4 }}
          title="Le plateau : cartographier son univers"
        >
          <span className="wb-cat-icon">🗺️</span>
          <span className="wb-cat-label">Plateau</span>
        </button>
      )}

      {/* ===== Accueil ===== */}
      <button
        onClick={() => onCategoryChange("home")}
        className={`wb-cat${isHomeActive && !boardActive ? " active" : ""}`}
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
