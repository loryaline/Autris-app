"use client";

import {
  categoriesForGenre,
  getCategoryDef,
  type WbCategory,
} from "@/lib/wb-constants";
import { buildWbMarkdown, downloadTextFile, slugify } from "@/lib/wb-export";
import type { Genre, WbEntry } from "@/types/database";

/**
 * Accueil du World Building : dashboard d'entrée proposant une vue d'ensemble
 * des 6 groupes de catégories (L'Univers, Le Vivant, Le Sacré, L'Obscur,
 * L'Interdit, Annexes) avec un compteur par catégorie et des fiches récentes.
 *
 * Sert de page d'atterrissage au lieu de tomber direct sur « Univers & Monde ».
 */
export function WbHome({
  projectTitle,
  genre,
  counts,
  entries,
  onPickCategory,
  onSelectEntry,
}: {
  projectTitle: string;
  genre: Genre;
  counts: Record<string, number>;
  entries: WbEntry[];
  onPickCategory: (c: WbCategory) => void;
  onSelectEntry: (id: string) => void;
}) {
  const cats = categoriesForGenre(genre);

  // Groupement par `group` (L'Univers, Le Vivant, Le Sacré, L'Obscur, L'Interdit, Annexes)
  const grouped = cats.reduce<Record<string, typeof cats>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  const totalFiches = entries.filter((e) => e.status !== "archive").length;

  // Fiches récentes (hors archivées), max 6
  const recent = [...entries]
    .filter((e) => e.status !== "archive" && (e.title ?? "").trim().length > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  function handleExport() {
    const md = buildWbMarkdown(
      entries as unknown as Parameters<typeof buildWbMarkdown>[0],
      projectTitle,
    );
    downloadTextFile(`univers-${slugify(projectTitle)}.md`, md);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        {/* ========== Header ========== */}
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className="text-[10px] font-medium text-text-quaternary uppercase flex items-center gap-1.5"
              style={{ letterSpacing: "0.18em" }}
            >
              <span>World Building</span>
              <span className="opacity-50">·</span>
              <span>Accueil</span>
            </div>
            <h1 className="mt-2 flex items-baseline gap-3 text-[34px] leading-none text-text-primary">
              <span className="font-light">Le monde de</span>
              <span
                className="font-serif italic"
                style={{ color: "var(--color-accent)" }}
              >
                {projectTitle}
              </span>
            </h1>
            <div className="mt-2.5 text-[12.5px] text-text-tertiary font-serif italic">
              {totalFiches === 0
                ? "Aucune fiche pour l'instant. Choisis une catégorie pour commencer à bâtir ton univers."
                : totalFiches === 1
                  ? "1 fiche esquissée — c'est un début."
                  : `${totalFiches} fiches esquissées. Plonge dans une catégorie pour continuer.`}
            </div>
          </div>

          {totalFiches > 0 && (
            <button
              onClick={handleExport}
              title="Exporter tout l'univers en Markdown (importable dans Notion)"
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] border border-white/[0.08] bg-bg-secondary text-[12.5px] text-text-secondary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2V9M7 9L4 6M7 9L10 6M2.5 11H11.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Exporter l&apos;univers
            </button>
          )}
        </header>

        {/* ========== Sections par groupe ========== */}
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([group, items]) => {
            const groupTotal = items.reduce((sum, c) => sum + (counts[c.key] ?? 0), 0);
            return (
              <section key={group}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2
                    className="text-[11px] font-medium text-text-quaternary uppercase"
                    style={{ letterSpacing: "0.22em" }}
                  >
                    {group}
                  </h2>
                  <span className="text-[10.5px] text-text-quaternary/70 font-serif italic">
                    {groupTotal} fiche{groupTotal > 1 ? "s" : ""}
                  </span>
                </div>
                <div
                  className="grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                >
                  {items.map((c) => {
                    const n = counts[c.key] ?? 0;
                    const isEmpty = n === 0;
                    return (
                      <button
                        key={c.key}
                        onClick={() => onPickCategory(c.key)}
                        className={`group relative flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] border text-left cursor-pointer transition-all ${
                          isEmpty
                            ? "border-white/[0.05] bg-transparent hover:border-white/[0.12] hover:bg-white/[0.02]"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-[var(--color-accent)]/40 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] shrink-0 text-[18px]"
                          style={{
                            background: isEmpty ? "rgba(255,255,255,0.02)" : "rgba(239,159,39,0.08)",
                            border: isEmpty
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "1px solid rgba(239,159,39,0.20)",
                          }}
                          aria-hidden
                        >
                          {c.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[13px] leading-tight ${
                              isEmpty ? "text-text-secondary" : "text-text-primary"
                            }`}
                          >
                            {c.label}
                          </div>
                          <div
                            className={`mt-1 text-[10.5px] font-serif italic ${
                              isEmpty ? "text-text-quaternary/70" : "text-text-tertiary"
                            }`}
                          >
                            {n === 0
                              ? "Aucune fiche"
                              : n === 1
                                ? "1 fiche"
                                : `${n} fiches`}
                          </div>
                        </div>
                        <span
                          className="text-[14px] text-text-quaternary/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* ========== Récentes ========== */}
        {recent.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline gap-3 mb-3">
              <h2
                className="text-[11px] font-medium text-text-quaternary uppercase"
                style={{ letterSpacing: "0.22em" }}
              >
                Récemment modifiées
              </h2>
            </div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
            >
              {recent.map((e) => {
                const cat = getCategoryDef(e.category);
                return (
                  <button
                    key={e.id}
                    onClick={() => onSelectEntry(e.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-[var(--radius-md)] border border-white/[0.05] hover:border-[var(--color-accent)]/40 hover:bg-white/[0.03] cursor-pointer transition-all text-left"
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] bg-white/[0.04] text-[13px] shrink-0"
                      aria-hidden
                    >
                      {cat?.icon ?? "✦"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] text-text-primary truncate">
                        {e.title || "Sans titre"}
                      </div>
                      <div
                        className="text-[9.5px] font-medium uppercase text-text-quaternary truncate"
                        style={{ letterSpacing: "0.16em" }}
                      >
                        {cat?.label ?? e.category}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
