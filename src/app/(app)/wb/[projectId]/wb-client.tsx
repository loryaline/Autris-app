"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Genre, WbEntry } from "@/types/database";
import {
  categoriesForGenre,
  getCategoryDef,
  UNIVERS_SUBTYPES,
  BESTIAIRE_SUBCATEGORIES,
  type WbCategory,
} from "@/lib/wb-constants";
import { WbSubSidebar } from "@/components/wb/WbSubSidebar";
import { WbEntryDetail } from "@/components/wb/WbEntryDetail";
import { Moodboard } from "@/components/wb/Moodboard";

export function WbClient({
  projectId,
  projectTitle,
  genre,
  initialEntries,
}: {
  projectId: string;
  projectTitle: string;
  genre: Genre;
  initialEntries: WbEntry[];
}) {
  const [entries, setEntries] = useState<WbEntry[]>(initialEntries);
  const [activeCategory, setActiveCategory] = useState<WbCategory>(() => {
    return categoriesForGenre(genre)[0]?.key ?? "univers_monde";
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [universSubFilter, setUniversSubFilter] = useState<string>("all");
  const [bestiaireSubFilter, setBestiaireSubFilter] = useState<string>("all");
  const [showSubtypeMenu, setShowSubtypeMenu] = useState(false);
  const [showBestiaireMenu, setShowBestiaireMenu] = useState(false);
  const supabase = createClient();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) {
      if (e.status !== "archive") c[e.category] = (c[e.category] ?? 0) + 1;
    }
    return c;
  }, [entries]);

  const categoryEntries = useMemo(() => {
    let list = entries.filter(
      (e) => e.category === activeCategory && e.status !== "archive"
    );
    if (activeCategory === "univers_monde" && universSubFilter !== "all") {
      list = list.filter((e) => e.subcategory === universSubFilter);
    }
    if (activeCategory === "bestiaire" && bestiaireSubFilter !== "all") {
      list = list.filter((e) => e.subcategory === bestiaireSubFilter);
    }
    return list;
  }, [entries, activeCategory, universSubFilter, bestiaireSubFilter]);

  const selectedEntry = selectedId
    ? entries.find((e) => e.id === selectedId) ?? null
    : null;

  const catDef = getCategoryDef(activeCategory);

  async function createEntry(subcategory?: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const subDef = subcategory
      ? UNIVERS_SUBTYPES.find((s) => s.key === subcategory)
      : undefined;
    const defaultTitle =
      activeCategory === "univers_monde" && subDef
        ? `Nouvelle fiche ${subDef.label}`
        : "Nouvelle fiche";
    const { data, error } = await supabase
      .from("wb_entries")
      .insert({
        project_id: projectId,
        user_id: user.user.id,
        category: activeCategory,
        subcategory: subcategory ?? null,
        title: defaultTitle,
      })
      .select()
      .single();
    if (error || !data) return;
    setEntries((prev) => [data as WbEntry, ...prev]);
    setSelectedId((data as WbEntry).id);
    setShowSubtypeMenu(false);
  }

  function updateEntry(updated: WbEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="flex h-full">
      <WbSubSidebar
        genre={genre}
        activeCategory={activeCategory}
        onCategoryChange={(c) => {
          setActiveCategory(c);
          setSelectedId(null);
        }}
        counts={counts}
      />

      {selectedEntry ? (
        <WbEntryDetail
          entry={selectedEntry}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
          onClose={() => setSelectedId(null)}
        />
      ) : activeCategory === "moodboard" ? (
        <Moodboard
          projectId={projectId}
          projectTitle={projectTitle}
          entries={entries.filter((e) => e.category === "moodboard")}
          onEntriesChange={(next) =>
            setEntries((prev) => [
              ...prev.filter((e) => e.category !== "moodboard"),
              ...next,
            ])
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto bg-bg-primary">
          <div className="max-w-5xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] text-text-tertiary uppercase tracking-wider">
                  {projectTitle} · World Building
                </div>
                <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-2 mt-0.5">
                  <span>{catDef?.icon}</span>
                  <span>{catDef?.label}</span>
                </h1>
              </div>
              {activeCategory === "univers_monde" ? (
                <div className="relative">
                  <button
                    onClick={() => setShowSubtypeMenu((s) => !s)}
                    className="text-[12px] px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark cursor-pointer"
                  >
                    + Nouvelle fiche ▾
                  </button>
                  {showSubtypeMenu && (
                    <div className="absolute right-0 top-full mt-1 w-[220px] bg-bg-primary border border-border rounded shadow-lg z-10 py-1">
                      {UNIVERS_SUBTYPES.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => createEntry(s.key)}
                          className="w-full text-left px-3 py-1.5 text-[12.5px] text-text-primary hover:bg-bg-hover flex items-center gap-2 cursor-pointer"
                        >
                          <span>{s.icon}</span>
                          <span className="flex-1">{s.label}</span>
                          {s.hasTemplate && (
                            <span className="text-[9px] px-1 py-0.5 bg-primary-bg text-primary-dark rounded">
                              template
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeCategory === "bestiaire" ? (
                <div className="relative">
                  <button
                    onClick={() => setShowBestiaireMenu((s) => !s)}
                    className="text-[12px] px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark cursor-pointer"
                  >
                    + Nouvelle créature ▾
                  </button>
                  {showBestiaireMenu && (
                    <div className="absolute right-0 top-full mt-1 w-[200px] bg-bg-primary border border-border rounded shadow-lg z-10 py-1">
                      {BESTIAIRE_SUBCATEGORIES.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => {
                            createEntry(s.key);
                            setShowBestiaireMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-[12.5px] text-text-primary hover:bg-bg-hover cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => createEntry()}
                  className="text-[12px] px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark cursor-pointer"
                >
                  + Nouvelle fiche
                </button>
              )}
            </div>

            {/* Filtre par sous-type pour Univers & Monde */}
            {activeCategory === "univers_monde" && (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <button
                  onClick={() => setUniversSubFilter("all")}
                  className={`text-[11px] px-2 py-1 rounded cursor-pointer transition-colors ${
                    universSubFilter === "all"
                      ? "bg-primary-bg text-primary-dark font-medium"
                      : "bg-bg-secondary text-text-tertiary hover:text-text-primary"
                  }`}
                >
                  Tout
                </button>
                {UNIVERS_SUBTYPES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setUniversSubFilter(s.key)}
                    className={`text-[11px] px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                      universSubFilter === s.key
                        ? "bg-primary-bg text-primary-dark font-medium"
                        : "bg-bg-secondary text-text-tertiary hover:text-text-primary"
                    }`}
                  >
                    <span>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Filtre par sous-catégorie pour Bestiaire */}
            {activeCategory === "bestiaire" && (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <button
                  onClick={() => setBestiaireSubFilter("all")}
                  className={`text-[11px] px-2 py-1 rounded cursor-pointer transition-colors ${
                    bestiaireSubFilter === "all"
                      ? "bg-primary-bg text-primary-dark font-medium"
                      : "bg-bg-secondary text-text-tertiary hover:text-text-primary"
                  }`}
                >
                  Tout
                </button>
                {BESTIAIRE_SUBCATEGORIES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setBestiaireSubFilter(s.key)}
                    className={`text-[11px] px-2 py-1 rounded cursor-pointer transition-colors ${
                      bestiaireSubFilter === s.key
                        ? "bg-primary-bg text-primary-dark font-medium"
                        : "bg-bg-secondary text-text-tertiary hover:text-text-primary"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            {categoryEntries.length === 0 ? (
              <div className="text-center py-16 text-text-tertiary text-[13px]">
                Aucune fiche dans cette catégorie.
                {activeCategory === "univers_monde" ? (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {UNIVERS_SUBTYPES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => createEntry(s.key)}
                        className="text-[11px] px-2 py-1 bg-bg-secondary border border-border rounded hover:border-primary cursor-pointer flex items-center gap-1"
                      >
                        <span>{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <br />
                    <button
                      onClick={() => createEntry()}
                      className="mt-3 text-primary hover:underline cursor-pointer"
                    >
                      Créer la première fiche
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryEntries.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className="text-left p-3 bg-bg-secondary border border-border rounded hover:border-primary transition-colors cursor-pointer"
                  >
                    {e.subcategory && activeCategory === "univers_monde" && (
                      <div className="text-[9px] uppercase tracking-wider text-primary mb-0.5 flex items-center gap-1">
                        <span>
                          {UNIVERS_SUBTYPES.find((s) => s.key === e.subcategory)?.icon}
                        </span>
                        {UNIVERS_SUBTYPES.find((s) => s.key === e.subcategory)?.label}
                      </div>
                    )}
                    <div className="text-[13px] font-medium text-text-primary truncate">
                      {e.title}
                    </div>
                    {e.subtitle && (
                      <div className="text-[11px] text-text-tertiary truncate mt-0.5">
                        {e.subtitle}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-quaternary">
                        {new Date(e.updated_at).toLocaleDateString("fr-FR")}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          e.status === "valide"
                            ? "bg-[#1D9E75]/20 text-[#1D9E75]"
                            : "bg-bg-hover text-text-tertiary"
                        }`}
                      >
                        {e.status === "valide" ? "Validé" : "Brouillon"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
