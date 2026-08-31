"use client";

import { useEffect } from "react";

/**
 * Les gestes du plateau, écrits quelque part.
 *
 * Autris repose sur des gestes qu'aucun écran ne montre : Ctrl+K, le
 * lasso, le double-clic pour ouvrir une fiche, le glisser depuis un bord
 * pour tirer un lien. Une utilisatrice qui ne les connaît pas ne les
 * découvre jamais — rien ne les signale, et rien ne dit qu'ils existent.
 *
 * Ce panneau ne fait rien d'autre que les nommer. Pas de données, pas
 * d'état à retenir : du texte, à l'endroit où il sert.
 */

type Row = { keys: string[]; what: string };

const GESTES: { title: string; rows: Row[] }[] = [
  {
    title: "Se déplacer",
    rows: [
      { keys: ["Glisser le fond"], what: "Déplacer le plateau" },
      { keys: ["Molette"], what: "Déplacer verticalement" },
      { keys: ["Ctrl", "Molette"], what: "Zoomer" },
      { keys: ["Double-clic sur le fond"], what: "Revenir à la vue initiale du panneau" },
    ],
  },
  {
    title: "Sélectionner",
    rows: [
      { keys: ["Clic"], what: "Sélectionner un objet et déplier son aperçu" },
      { keys: ["Maj", "Glisser"], what: "Lasso : tout ce qu'il touche est pris" },
      { keys: ["Maj", "Clic"], what: "Ajouter ou retirer de la sélection" },
      { keys: ["Suppr"], what: "Retirer du plateau — jamais de l'univers" },
    ],
  },
  {
    title: "Poser et relier",
    rows: [
      { keys: ["Glisser depuis la palette"], what: "Poser une fiche sur le plateau" },
      { keys: ["Glisser un point de bord"], what: "Tirer un lien vers une autre vignette" },
      { keys: ["Double-clic sur une vignette"], what: "Ouvrir la fiche dans le panneau" },
      { keys: ["Double-clic sur un texte"], what: "Le modifier" },
      { keys: ["Glisser l'étiquette d'une flèche"], what: "Courber le trait" },
    ],
  },
  {
    title: "Revenir en arrière",
    rows: [
      { keys: ["Ctrl", "Z"], what: "Annuler" },
      { keys: ["Ctrl", "Maj", "Z"], what: "Refaire" },
      { keys: ["Ctrl", "K"], what: "Chercher dans tout le World Building" },
    ],
  },
];

export function BoardHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} />
      <div
        className="fixed z-[85] inset-x-0 top-[10vh] mx-auto w-[min(560px,92vw)] max-h-[76vh] overflow-y-auto rounded-[var(--radius-md)] shadow-2xl"
        style={{
          background: "var(--bg-3)",
          border: "1px solid var(--border-soft)",
        }}
        role="dialog"
        aria-label="Gestes du plateau"
      >
        <div
          className="sticky top-0 flex items-baseline gap-3 px-5 pt-4 pb-3"
          style={{
            background: "var(--bg-3)",
            borderBottom: "1px solid var(--border-soft)",
          }}
        >
          <h2
            className="font-serif text-[17px] flex-1"
            style={{ color: "var(--text-1)" }}
          >
            Les gestes du plateau
          </h2>
          <button
            onClick={onClose}
            className="rd-icon-btn"
            title="Fermer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">
          {GESTES.map((g) => (
            <div key={g.title}>
              <div
                className="text-[10px] uppercase mb-2"
                style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
              >
                {g.title}
              </div>
              <div className="flex flex-col gap-1.5">
                {g.rows.map((r) => (
                  <div
                    key={r.what}
                    className="flex items-baseline gap-3 text-[12.5px]"
                  >
                    <span className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && (
                            <span style={{ color: "var(--text-4)" }}>+</span>
                          )}
                          <kbd
                            className="px-1.5 py-0.5 rounded text-[11px] font-normal"
                            style={{
                              background: "var(--bg-2)",
                              border: "1px solid var(--border-soft)",
                              color: "var(--text-2)",
                              fontFamily: "inherit",
                            }}
                          >
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </span>
                    <span
                      className="flex-1 min-w-0"
                      style={{ color: "var(--text-3)" }}
                    >
                      {r.what}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </>
  );
}
