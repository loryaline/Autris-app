"use client";

import { useEffect } from "react";

/**
 * Les panneaux de l'éditeur, sur téléphone.
 *
 * Au bureau, la structure du roman et le contexte du chapitre encadrent le
 * texte en colonnes. Sur 375 px il n'y a pas trois colonnes : les deux
 * panneaux disparaissaient, et l'écriture perdait tout ce qui l'entoure —
 * on ne pouvait plus changer de chapitre.
 *
 * Ils reviennent par un rail en bas de l'écran, sous le pouce. Une entrée
 * touchée déplie l'écran ENTIER : un panneau de 280 px superposé à un
 * écran de 375 serait illisible, alors que ces contenus — une liste de
 * chapitres, des scènes, des fiches liées — se lisent très bien en pleine
 * page. On consulte, on ferme, on retourne au texte.
 *
 * Le rail ne s'affiche jamais ailleurs que sur téléphone : c'est l'appelant
 * qui en décide, pour que ce composant reste ignorant de la mise en page.
 */

export type RailKey = "chapitres" | "info" | "scenes" | "world";

const ENTRIES: { key: RailKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "chapitres",
    label: "Chapitres",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M4 4h12M4 8h12M4 12h8M4 16h8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "info",
    label: "Infos",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="6.4" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "scenes",
    label: "Scènes",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3 8h14M8 8v7.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    key: "world",
    label: "Univers",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 10h14M10 3c2 2.2 2 11.8 0 14M10 3c-2 2.2-2 11.8 0 14"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
];

export function EditorMobileRail({
  open,
  onOpen,
  onClose,
  title,
  children,
}: {
  /** Panneau déplié, ou null si le rail est au repos. */
  open: RailKey | null;
  onOpen: (key: RailKey) => void;
  onClose: () => void;
  /** Titre de la feuille dépliée. */
  title: string;
  /** Contenu de la feuille — monté seulement quand elle est ouverte. */
  children: React.ReactNode;
}) {
  // Échap ferme, comme partout ailleurs dans Autris.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Le fond ne défile pas derrière la feuille : sur iOS, sans ça, le geste
  // finit par emporter la page au lieu du contenu.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex flex-col"
          style={{ background: "var(--bg)" }}
          role="dialog"
          aria-label={title}
        >
          <div
            className="flex items-center gap-3 px-4 h-12 shrink-0"
            style={{ borderBottom: "1px solid var(--border-soft)" }}
          >
            <span
              className="font-serif text-[16px] flex-1 truncate"
              style={{ color: "var(--text-1)" }}
            >
              {title}
            </span>
            <button
              onClick={onClose}
              className="rd-icon-btn"
              title="Fermer"
              aria-label="Fermer et revenir au texte"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </div>
      )}

      <nav
        aria-label="Panneaux du chapitre"
        className="fixed inset-x-0 bottom-0 z-[75] flex"
        style={{
          background: "var(--bg-2)",
          borderTop: "1px solid var(--border-soft)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {ENTRIES.map((e) => {
          const active = open === e.key;
          return (
            <button
              key={e.key}
              onClick={() => (active ? onClose() : onOpen(e.key))}
              aria-pressed={active}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] bg-transparent border-none cursor-pointer"
              style={{
                color: active ? "var(--accent)" : "var(--text-3)",
                minHeight: 54,
              }}
            >
              {e.icon}
              {e.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
