"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Genre, WbEntry, WbLink, WbStatus } from "@/types/database";
import {
  categoriesForGenre,
  getCategoryDef,
  MOEURS_TABLE_GENRES,
  UNIVERS_SUBTYPES,
  BESTIAIRE_SUBCATEGORIES,
  type WbCategory,
} from "@/lib/wb-constants";
import { WbSubSidebar } from "@/components/wb/WbSubSidebar";
import { WbEntryDetail } from "@/components/wb/WbEntryDetail";
import { Moodboard } from "@/components/wb/Moodboard";
import { WbCommandPalette } from "@/components/wb/WbCommandPalette";
import { WbMoeursTable } from "@/components/wb/WbMoeursTable";
import { summarizeEntry } from "@/lib/wb-summary";

type SortMode = "recent" | "alpha" | "old";
type StatusFilter = "all" | WbStatus;
type UniversView = "grid" | "moeurs";

export function WbClient({
  projectId,
  projectTitle,
  genre,
  initialEntries,
  initialLinks,
}: {
  projectId: string;
  projectTitle: string;
  genre: Genre;
  initialEntries: WbEntry[];
  initialLinks: WbLink[];
}) {
  const [entries, setEntries] = useState<WbEntry[]>(initialEntries);
  const [links, setLinks] = useState<WbLink[]>(initialLinks);
  const [activeCategory, setActiveCategory] = useState<WbCategory>(() => {
    return categoriesForGenre(genre)[0]?.key ?? "univers_monde";
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [universSubFilter, setUniversSubFilter] = useState<string>("all");
  const [bestiaireSubFilter, setBestiaireSubFilter] = useState<string>("all");
  const [showSubtypeMenu, setShowSubtypeMenu] = useState(false);
  const [showBestiaireMenu, setShowBestiaireMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [universView, setUniversView] = useState<UniversView>("grid");
  const supabase = createClient();

  // Raccourci Ctrl+K / Cmd+K pour ouvrir la palette de recherche
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) {
      if (e.status !== "archive") c[e.category] = (c[e.category] ?? 0) + 1;
    }
    return c;
  }, [entries]);

  const categoryEntries = useMemo(() => {
    let list = entries.filter((e) => e.category === activeCategory);
    // Statut : par défaut on masque les archivés
    if (statusFilter === "all") {
      list = list.filter((e) => e.status !== "archive");
    } else {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (activeCategory === "univers_monde" && universSubFilter !== "all") {
      list = list.filter((e) => e.subcategory === universSubFilter);
    }
    if (activeCategory === "bestiaire" && bestiaireSubFilter !== "all") {
      list = list.filter((e) => e.subcategory === bestiaireSubFilter);
    }
    if (tagFilter !== "all") {
      list = list.filter((e) => (e.tags ?? []).includes(tagFilter));
    }
    // Tri
    list = [...list].sort((a, b) => {
      if (sortMode === "alpha") {
        return (a.title || "").localeCompare(b.title || "", "fr", {
          sensitivity: "base",
        });
      }
      const ta = new Date(a.updated_at).getTime();
      const tb = new Date(b.updated_at).getTime();
      return sortMode === "recent" ? tb - ta : ta - tb;
    });
    return list;
  }, [
    entries,
    activeCategory,
    universSubFilter,
    bestiaireSubFilter,
    statusFilter,
    tagFilter,
    sortMode,
  ]);

  const showMoeursToggle =
    activeCategory === "univers_monde" && MOEURS_TABLE_GENRES.includes(genre);

  const selectedEntry = selectedId
    ? entries.find((e) => e.id === selectedId) ?? null
    : null;

  const catDef = getCategoryDef(activeCategory);

  const projectTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) for (const t of e.tags ?? []) set.add(t);
    return Array.from(set).sort();
  }, [entries]);

  // Index des liens par id de fiche (inclut les deux extrémités)
  const linksByEntryId = useMemo(() => {
    const map = new Map<string, WbLink[]>();
    for (const l of links) {
      if (!map.has(l.from_entry_id)) map.set(l.from_entry_id, []);
      map.get(l.from_entry_id)!.push(l);
      if (!map.has(l.to_entry_id)) map.set(l.to_entry_id, []);
      map.get(l.to_entry_id)!.push(l);
    }
    return map;
  }, [links]);

  function addLink(link: WbLink) {
    setLinks((prev) => [...prev, link]);
  }
  function removeLinkLocal(linkId: string) {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  async function createEntry(subcategory?: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    // Titre laissé vide volontairement : l'utilisateur est invité à nommer
    // immédiatement la fiche grâce à l'auto-focus côté WbEntryDetail.
    const { data, error } = await supabase
      .from("wb_entries")
      .insert({
        project_id: projectId,
        user_id: user.user.id,
        category: activeCategory,
        subcategory: subcategory ?? null,
        title: "",
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

  function selectEntry(id: string) {
    const target = entries.find((e) => e.id === id);
    if (target && target.category !== activeCategory) {
      setActiveCategory(target.category as WbCategory);
      if (target.category === "univers_monde") setUniversView("grid");
    }
    setSelectedId(id);
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
          projectId={projectId}
          allEntries={entries}
          projectTags={projectTags}
          entryLinks={linksByEntryId.get(selectedEntry.id) ?? []}
          onSelectEntry={selectEntry}
          onLinkAdded={addLink}
          onLinkRemoved={removeLinkLocal}
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
            <div className="flex items-center justify-between mb-5 gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-text-tertiary uppercase tracking-wider">
                  {projectTitle} · World Building
                </div>
                <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-2 mt-0.5">
                  <span>{catDef?.icon}</span>
                  <span>{catDef?.label}</span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="text-[11px] px-2 py-1.5 bg-bg-secondary border border-border rounded hover:border-primary cursor-pointer flex items-center gap-1.5"
                  title="Rechercher (Ctrl+K)"
                >
                  <span>🔎</span>
                  <span className="text-text-tertiary">Rechercher</span>
                  <kbd className="text-[9px] text-text-quaternary border border-border rounded px-1">
                    Ctrl K
                  </kbd>
                </button>
                {showMoeursToggle && (
                  <div className="flex items-center bg-bg-secondary border border-border rounded overflow-hidden">
                    <button
                      onClick={() => setUniversView("grid")}
                      className={`text-[11px] px-2 py-1.5 cursor-pointer ${
                        universView === "grid"
                          ? "bg-primary-bg text-primary-dark font-medium"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      Grille
                    </button>
                    <button
                      onClick={() => setUniversView("moeurs")}
                      className={`text-[11px] px-2 py-1.5 cursor-pointer border-l border-border ${
                        universView === "moeurs"
                          ? "bg-primary-bg text-primary-dark font-medium"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                      title="Tableau comparatif des pays"
                    >
                      Tableau des mœurs
                    </button>
                  </div>
                )}
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
            </div>

            {/* Barre de filtres : statut / tag / tri (cachée en vue tableau) */}
            {!(activeCategory === "univers_monde" && universView === "moeurs") && (
              <div className="flex items-center gap-2 mb-3 flex-wrap text-[11px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-2 py-1 bg-bg-secondary border border-border rounded cursor-pointer"
                >
                  <option value="all">Tous statuts (actifs)</option>
                  <option value="brouillon">Brouillon</option>
                  <option value="valide">Validé</option>
                  <option value="archive">Archivé</option>
                </select>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  disabled={projectTags.length === 0}
                  className="px-2 py-1 bg-bg-secondary border border-border rounded cursor-pointer disabled:opacity-50"
                >
                  <option value="all">Tous les tags</option>
                  {projectTags.map((t) => (
                    <option key={t} value={t}>
                      #{t}
                    </option>
                  ))}
                </select>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="px-2 py-1 bg-bg-secondary border border-border rounded cursor-pointer"
                >
                  <option value="recent">Tri : récent</option>
                  <option value="old">Tri : ancien</option>
                  <option value="alpha">Tri : alphabétique</option>
                </select>
                {(statusFilter !== "all" ||
                  tagFilter !== "all" ||
                  sortMode !== "recent") && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setTagFilter("all");
                      setSortMode("recent");
                    }}
                    className="px-2 py-1 text-text-tertiary hover:text-primary cursor-pointer"
                  >
                    ↺ Réinitialiser
                  </button>
                )}
                <span className="ml-auto text-text-quaternary">
                  {categoryEntries.length} fiche
                  {categoryEntries.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

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

            {/* Vue Tableau des mœurs (Pays comparés) */}
            {activeCategory === "univers_monde" && universView === "moeurs" ? (
              <WbMoeursTable entries={entries} onSelectEntry={selectEntry} />
            ) : /* Grid */
            categoryEntries.length === 0 ? (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryEntries.map((e) => {
                  const snippets = summarizeEntry(e);
                  const hasTitle = (e.title ?? "").trim().length > 0;
                  const entryLinksList = linksByEntryId.get(e.id) ?? [];
                  const linkedTitles = entryLinksList
                    .map((l) => {
                      const otherId =
                        l.from_entry_id === e.id ? l.to_entry_id : l.from_entry_id;
                      const other = entries.find((x) => x.id === otherId);
                      return other ? { id: other.id, title: other.title || "Sans titre" } : null;
                    })
                    .filter((x): x is { id: string; title: string } => x !== null);
                  const subDef =
                    activeCategory === "univers_monde" && e.subcategory
                      ? UNIVERS_SUBTYPES.find((s) => s.key === e.subcategory)
                      : null;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className="group relative text-left rounded-lg overflow-hidden border border-border hover:border-primary transition-all cursor-pointer flex flex-col min-h-[280px] bg-bg-secondary shadow-sm hover:shadow-lg"
                    >
                      {/* Image de fond */}
                      {e.main_image_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={e.main_image_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {/* Dégradé sombre pour lisibilité */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary to-bg-primary" />
                      )}

                      {/* Contenu au-dessus */}
                      <div className="relative z-10 flex flex-col h-full p-3">
                        {/* Header : sous-catégorie */}
                        {subDef && (
                          <div className="text-[9px] uppercase tracking-wider text-white/80 mb-1 flex items-center gap-1 drop-shadow">
                            <span>{subDef.icon}</span>
                            {subDef.label}
                          </div>
                        )}

                        {/* Titre */}
                        <div
                          className={`text-[15px] font-semibold leading-tight drop-shadow-lg ${
                            hasTitle
                              ? e.main_image_url
                                ? "text-white"
                                : "text-text-primary"
                              : "italic text-white/60"
                          }`}
                        >
                          {hasTitle ? e.title : "Sans titre"}
                        </div>
                        {e.subtitle && (
                          <div className="text-[11px] text-white/70 mt-0.5 drop-shadow">
                            {e.subtitle}
                          </div>
                        )}

                        {/* Spacer pour pousser le contenu en bas */}
                        <div className="flex-1" />

                        {/* Aperçu */}
                        {snippets.length > 0 ? (
                          <div className="mt-2 flex flex-col gap-0.5">
                            {snippets.slice(0, 2).map((s, i) => (
                              <div key={i} className="text-[11px] leading-snug drop-shadow">
                                <span className="text-white/60">{s.label} : </span>
                                <span className="text-white/90 line-clamp-1">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] italic text-white/60 drop-shadow">
                            Fiche vide — clique pour la renseigner
                          </div>
                        )}

                        {/* Liens */}
                        {linkedTitles.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-white/60">🔗</span>
                            {linkedTitles.slice(0, 2).map((l) => (
                              <span
                                key={l.id}
                                className="text-[9px] px-1.5 py-0.5 bg-white/15 backdrop-blur-sm text-white/90 rounded truncate max-w-[100px] border border-white/10"
                                title={l.title}
                              >
                                {l.title}
                              </span>
                            ))}
                            {linkedTitles.length > 2 && (
                              <span className="text-[9px] text-white/60">
                                +{linkedTitles.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        {e.tags && e.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {e.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-[9px] px-1.5 py-0.5 bg-primary/40 backdrop-blur-sm text-white rounded border border-primary/30"
                              >
                                {t}
                              </span>
                            ))}
                            {e.tags.length > 3 && (
                              <span className="text-[9px] text-white/60">
                                +{e.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                          <span className="text-[10px] text-white/60">
                            {new Date(e.updated_at).toLocaleDateString("fr-FR")}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm border ${
                              e.status === "valide"
                                ? "bg-[#1D9E75]/30 text-[#6EE7B7] border-[#1D9E75]/40"
                                : "bg-white/10 text-white/70 border-white/10"
                            }`}
                          >
                            {e.status === "valide" ? "Validé" : "Brouillon"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <WbCommandPalette
        open={paletteOpen}
        entries={entries}
        onClose={() => setPaletteOpen(false)}
        onSelectEntry={selectEntry}
      />
    </div>
  );
}
