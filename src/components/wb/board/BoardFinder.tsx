"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WbBoardNode, WbEntry } from "@/types/database";
import { getCategoryDef } from "@/lib/wb-constants";

/**
 * Trouver et filtrer sur un plateau chargé.
 *
 * Les deux répondent à la même question — « où est ce que je cherche ? » —
 * et vivent donc dans le même contrôle. Chercher isole une fiche ; filtrer
 * isole une famille de fiches. Dans les deux cas, ce qui ne correspond pas
 * est ESTOMPÉ et non retiré : un plateau amputé de ses vignettes couperait
 * les flèches qui les traversent et raconterait un univers faux.
 *
 * Rien n'est écrit : filtrer est un point de vue, pas une modification.
 */

export interface BoardFilter {
  /** Catégories retenues. Vide = aucun filtre de catégorie. */
  categories: Set<string>;
  /** Couleurs de vignette retenues. Vide = aucun filtre de couleur. */
  colors: Set<string>;
}

export const EMPTY_FILTER: BoardFilter = {
  categories: new Set(),
  colors: new Set(),
};

export function filterIsActive(f: BoardFilter): boolean {
  return f.categories.size > 0 || f.colors.size > 0;
}

/**
 * Objets à mettre en retrait — ceux qu'aucun critère retenu ne décrit.
 *
 * Les objets sans fiche (post-its, cadres, formes) ne sont jamais estompés
 * par un filtre de catégorie : ils n'en ont pas, et les faire disparaître
 * viderait le plateau de ses repères. Un filtre de couleur, en revanche,
 * les concerne comme les autres.
 */
export function dimmedByFilter(
  nodes: WbBoardNode[],
  entriesById: Map<string, WbEntry>,
  f: BoardFilter,
): Set<string> {
  const out = new Set<string>();
  if (!filterIsActive(f)) return out;
  for (const n of nodes) {
    if (f.categories.size > 0) {
      const cat = n.entry_id ? entriesById.get(n.entry_id)?.category : null;
      if (cat && !f.categories.has(cat)) {
        out.add(n.id);
        continue;
      }
    }
    if (f.colors.size > 0) {
      const c = (n.style.color as string) ?? "var(--accent)";
      if (!f.colors.has(c)) out.add(n.id);
    }
  }
  return out;
}

export function BoardFinder({
  nodes,
  entriesById,
  filter,
  onFilterChange,
  onGoTo,
  palette,
}: {
  nodes: WbBoardNode[];
  entriesById: Map<string, WbEntry>;
  filter: BoardFilter;
  onFilterChange: (f: BoardFilter) => void;
  /** Centre la vue sur cet objet et le sélectionne. */
  onGoTo: (node: WbBoardNode) => void;
  /** Couleurs proposées, dans l'ordre de la barre d'outils. */
  palette: { label: string; stroke: string }[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !showFilters) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, showFilters]);

  /** Le texte par lequel un objet se laisse trouver. */
  const titleOf = (n: WbBoardNode): string => {
    if (n.entry_id) return entriesById.get(n.entry_id)?.title ?? "";
    if (n.kind === "cadre") return (n.content.title as string) ?? "";
    // Post-it et texte : leur contenu est du HTML, on le dépouille.
    const html = (n.content.html as string) ?? "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .map((n) => ({ node: n, title: titleOf(n) }))
      .filter((h) => h.title.toLowerCase().includes(q))
      .slice(0, 8);
    // titleOf ne dépend que de entriesById.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, nodes, entriesById]);

  /** Catégories réellement présentes : filtrer sur du vide n'a pas de sens. */
  const presentCategories = useMemo(() => {
    const s = new Set<string>();
    for (const n of nodes) {
      const cat = n.entry_id ? entriesById.get(n.entry_id)?.category : null;
      if (cat) s.add(cat);
    }
    return [...s];
  }, [nodes, entriesById]);

  const toggle = (set: Set<string>, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const active = filterIsActive(filter);

  return (
    <div ref={boxRef} className="relative flex items-center gap-1">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
            }
            if (e.key === "Enter" && hits[0]) {
              onGoTo(hits[0].node);
              setOpen(false);
            }
          }}
          placeholder="Trouver…"
          className="h-7 w-[140px] px-2 rounded-[var(--radius-sm)] text-[12px]"
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-1)",
          }}
        />
        {open && query.trim() && (
          <div
            className="absolute right-0 top-full mt-1 w-[240px] rounded-[var(--radius-md)] py-1 shadow-2xl z-[70] max-h-[280px] overflow-y-auto"
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border-soft)",
            }}
          >
            {hits.length === 0 ? (
              <div
                className="px-3 py-2 text-[11.5px]"
                style={{ color: "var(--text-4)" }}
              >
                Rien de ce nom sur ce plateau.
              </div>
            ) : (
              hits.map(({ node, title }) => {
                const cat = node.entry_id
                  ? getCategoryDef(entriesById.get(node.entry_id)?.category ?? "")
                  : undefined;
                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      onGoTo(node);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer bg-transparent border-none hover:bg-white/[0.05] flex items-center gap-2"
                    style={{ color: "var(--text-2)" }}
                  >
                    <span className="shrink-0">
                      {cat?.icon ??
                        (node.kind === "cadre"
                          ? "▢"
                          : node.kind === "postit"
                            ? "▪"
                            : "T")}
                    </span>
                    <span className="truncate">{title || "Sans titre"}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowFilters((v) => !v)}
        title={
          active
            ? "Filtres actifs — cliquer pour les revoir"
            : "Filtrer l'affichage"
        }
        aria-label="Filtrer l'affichage"
        className="rd-icon-btn"
        style={active ? { color: "var(--accent)" } : undefined}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 3.5h10L8.2 7.8v3.1L5.8 12V7.8L2 3.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            fill={active ? "currentColor" : "none"}
          />
        </svg>
      </button>

      {showFilters && (
        <div
          className="absolute right-0 top-full mt-1 w-[260px] rounded-[var(--radius-md)] py-2 shadow-2xl z-[70]"
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <div
            className="px-3 pb-1.5 text-[10px] uppercase"
            style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
          >
            Catégories
          </div>
          {presentCategories.length === 0 ? (
            <div
              className="px-3 pb-1 text-[11.5px]"
              style={{ color: "var(--text-4)" }}
            >
              Aucune fiche posée : rien à filtrer pour l&apos;instant.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 px-2.5 pb-1">
              {presentCategories.map((c) => {
                const def = getCategoryDef(c);
                const on = filter.categories.has(c);
                return (
                  <button
                    key={c}
                    onClick={() =>
                      onFilterChange({
                        ...filter,
                        categories: toggle(filter.categories, c),
                      })
                    }
                    className="px-2 py-1 rounded-full text-[11px] cursor-pointer"
                    style={{
                      background: on ? "var(--accent-bg)" : "var(--bg-2)",
                      border: `1px solid ${on ? "var(--accent)" : "var(--border-soft)"}`,
                      color: on ? "var(--accent)" : "var(--text-3)",
                    }}
                  >
                    {def?.icon} {def?.label ?? c}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="px-3 pt-2 pb-1.5 text-[10px] uppercase"
            style={{ letterSpacing: "0.14em", color: "var(--text-4)" }}
          >
            Couleurs
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 pb-1">
            {palette.map((c) => {
              const on = filter.colors.has(c.stroke);
              return (
                <button
                  key={c.stroke}
                  onClick={() =>
                    onFilterChange({
                      ...filter,
                      colors: toggle(filter.colors, c.stroke),
                    })
                  }
                  title={c.label}
                  aria-label={c.label}
                  className="w-4 h-4 rounded-[3px] cursor-pointer"
                  style={{
                    background: c.stroke,
                    border: on
                      ? "2px solid var(--text-1)"
                      : "1px solid var(--border-soft)",
                  }}
                />
              );
            })}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] px-3">
            <button
              onClick={() => onFilterChange(EMPTY_FILTER)}
              disabled={!active}
              className="text-[11.5px] cursor-pointer bg-transparent border-none p-0 disabled:opacity-40 disabled:cursor-default"
              style={{ color: "var(--text-3)" }}
            >
              Tout réafficher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
