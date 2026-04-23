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
import { toneFor } from "@/lib/wb-tones";

type SortMode = "recent" | "alpha" | "old";
type StatusFilter = "all" | WbStatus;
type UniversView = "grid" | "moeurs";

/**
 * Rend un titre de catégorie en "serif mixte" : la dernière partie
 * (après le & ou le dernier espace) passe en italique doré, à la façon
 * des en-têtes du mockup (ex : « Univers & *Monde* »).
 */
function splitCategoryTitle(label: string): { head: string; tail: string } {
  const amp = label.indexOf(" & ");
  if (amp > 0) {
    return { head: label.slice(0, amp + 2), tail: label.slice(amp + 3) };
  }
  const lastSpace = label.lastIndexOf(" ");
  if (lastSpace > 0) {
    return { head: label.slice(0, lastSpace), tail: label.slice(lastSpace + 1) };
  }
  return { head: "", tail: label };
}

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
  const catTitleParts = catDef ? splitCategoryTitle(catDef.label) : { head: "", tail: "" };

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
          <div className="max-w-[1280px] mx-auto px-8 py-6">
            {/* Header : fil d'Ariane + titre serif + actions */}
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="min-w-0">
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase flex items-center gap-1.5"
                  style={{ letterSpacing: "0.18em" }}
                >
                  <span>{catDef?.group}</span>
                  <span className="opacity-50">·</span>
                  <span>Catégorie</span>
                </div>
                <h1 className="mt-1 flex items-center gap-3 text-[34px] leading-none text-text-primary">
                  {catTitleParts.head && (
                    <span className="font-light">{catTitleParts.head}</span>
                  )}
                  {catDef?.icon && (
                    <span className="text-[28px]" style={{ lineHeight: 1 }}>
                      {catDef.icon}
                    </span>
                  )}
                  <span
                    className="font-serif italic"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {catTitleParts.tail}
                  </span>
                </h1>
                {catDef?.label && (
                  <div className="mt-2 text-[12px] text-text-tertiary font-serif italic">
                    {universDescriptionFor(activeCategory, projectTitle)}
                  </div>
                )}
              </div>

              {/* Actions à droite : Grille/Tableau + Nouvelle fiche */}
              <div className="flex items-center gap-2 shrink-0">
                {showMoeursToggle && (
                  <div className="flex items-center h-9 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => setUniversView("grid")}
                      className={`h-full px-3 text-[12px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                        universView === "grid"
                          ? "bg-white/[0.05] text-text-primary"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      <IconGrid />
                      Grille
                    </button>
                    <button
                      onClick={() => setUniversView("moeurs")}
                      className={`h-full px-3 text-[12px] flex items-center gap-1.5 cursor-pointer border-l border-white/[0.06] transition-colors ${
                        universView === "moeurs"
                          ? "bg-white/[0.05] text-text-primary"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                      title="Tableau comparatif des pays"
                    >
                      <IconTable />
                      Tableau
                    </button>
                  </div>
                )}
                {activeCategory === "univers_monde" ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowSubtypeMenu((s) => !s)}
                      className="h-9 inline-flex items-center gap-2 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[12.5px] cursor-pointer transition-colors"
                    >
                      <span className="text-[13px]">+</span>
                      Nouvelle fiche
                    </button>
                    {showSubtypeMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowSubtypeMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-[240px] bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl z-20 py-1.5">
                          {UNIVERS_SUBTYPES.map((s) => (
                            <button
                              key={s.key}
                              onClick={() => createEntry(s.key)}
                              className="w-full text-left px-3 py-2 text-[12.5px] text-text-secondary hover:bg-white/[0.04] hover:text-text-primary flex items-center gap-2.5 cursor-pointer"
                            >
                              <span>{s.icon}</span>
                              <span className="flex-1">{s.label}</span>
                              {s.hasTemplate && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded border border-[var(--color-accent-border)]">
                                  template
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : activeCategory === "bestiaire" ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowBestiaireMenu((s) => !s)}
                      className="h-9 inline-flex items-center gap-2 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[12.5px] cursor-pointer transition-colors"
                    >
                      <span className="text-[13px]">+</span>
                      Nouvelle créature
                    </button>
                    {showBestiaireMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowBestiaireMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-[220px] bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl z-20 py-1.5">
                          {BESTIAIRE_SUBCATEGORIES.map((s) => (
                            <button
                              key={s.key}
                              onClick={() => {
                                createEntry(s.key);
                                setShowBestiaireMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[12.5px] text-text-secondary hover:bg-white/[0.04] hover:text-text-primary cursor-pointer"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => createEntry()}
                    className="h-9 inline-flex items-center gap-2 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[#2a1a10] font-medium text-[12.5px] cursor-pointer transition-colors"
                  >
                    <span className="text-[13px]">+</span>
                    Nouvelle fiche
                  </button>
                )}
              </div>
            </div>

            {/* Chips sous-catégories Univers */}
            {activeCategory === "univers_monde" && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <SubChip
                  active={universSubFilter === "all"}
                  onClick={() => setUniversSubFilter("all")}
                  label="Tout"
                />
                {UNIVERS_SUBTYPES.map((s) => (
                  <SubChip
                    key={s.key}
                    active={universSubFilter === s.key}
                    onClick={() => setUniversSubFilter(s.key)}
                    icon={s.icon}
                    label={s.label}
                  />
                ))}
              </div>
            )}

            {/* Chips sous-catégories Bestiaire */}
            {activeCategory === "bestiaire" && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <SubChip
                  active={bestiaireSubFilter === "all"}
                  onClick={() => setBestiaireSubFilter("all")}
                  label="Tout"
                />
                {BESTIAIRE_SUBCATEGORIES.map((s) => (
                  <SubChip
                    key={s.key}
                    active={bestiaireSubFilter === s.key}
                    onClick={() => setBestiaireSubFilter(s.key)}
                    label={s.label}
                  />
                ))}
              </div>
            )}

            {/* Barre filtres discrète + compteur */}
            {!(activeCategory === "univers_monde" && universView === "moeurs") && (
              <div className="flex items-center gap-2 mb-5 flex-wrap text-[11px]">
                <FilterSelect
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as StatusFilter)}
                  options={[
                    { value: "all", label: "Tous statuts" },
                    { value: "brouillon", label: "Brouillon" },
                    { value: "valide", label: "Validé" },
                    { value: "archive", label: "Archivé" },
                  ]}
                />
                <FilterSelect
                  value={tagFilter}
                  onChange={setTagFilter}
                  disabled={projectTags.length === 0}
                  options={[
                    { value: "all", label: "Tous les tags" },
                    ...projectTags.map((t) => ({ value: t, label: `#${t}` })),
                  ]}
                />
                {(statusFilter !== "all" ||
                  tagFilter !== "all" ||
                  sortMode !== "recent") && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setTagFilter("all");
                      setSortMode("recent");
                    }}
                    className="px-2 h-7 rounded-[var(--radius-sm)] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer transition-colors"
                  >
                    ↺ Réinitialiser
                  </button>
                )}
                <span className="ml-auto text-text-quaternary font-serif italic">
                  {categoryEntries.length} fiche
                  {categoryEntries.length > 1 ? "s" : ""}
                  <span className="opacity-50 mx-1.5">·</span>
                  <button
                    onClick={() =>
                      setSortMode(
                        sortMode === "recent"
                          ? "old"
                          : sortMode === "old"
                            ? "alpha"
                            : "recent"
                      )
                    }
                    className="hover:text-text-tertiary cursor-pointer"
                  >
                    Tri {sortMode === "recent" ? "récent" : sortMode === "old" ? "ancien" : "alphabétique"}
                  </button>
                </span>
              </div>
            )}

            {/* Vue Tableau des mœurs (Pays comparés) */}
            {activeCategory === "univers_monde" && universView === "moeurs" ? (
              <WbMoeursTable entries={entries} onSelectEntry={selectEntry} />
            ) : /* Grid */
            categoryEntries.length === 0 ? (
              <div className="text-center py-20 text-text-tertiary text-[13px] font-serif italic">
                Aucune fiche dans cette catégorie.
                {activeCategory === "univers_monde" ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5 not-italic font-sans">
                    {UNIVERS_SUBTYPES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => createEntry(s.key)}
                        className="text-[11px] px-2.5 py-1.5 bg-bg-secondary border border-white/[0.06] rounded-[var(--radius-sm)] hover:border-[var(--color-accent-border)] hover:text-text-primary cursor-pointer flex items-center gap-1.5 transition-colors"
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
                      className="mt-3 text-[var(--color-accent)] hover:underline cursor-pointer not-italic font-sans"
                    >
                      Créer la première fiche
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryEntries.map((e) => {
                  const snippets = summarizeEntry(e);
                  const hasTitle = (e.title ?? "").trim().length > 0;
                  const subDef =
                    activeCategory === "univers_monde" && e.subcategory
                      ? UNIVERS_SUBTYPES.find((s) => s.key === e.subcategory)
                      : null;
                  const tone = toneFor(e.category, e.subcategory);
                  const badgeLabel = subDef
                    ? `${catDef?.group ?? ""} · ${subDef.label}`.trim()
                    : catDef?.label ?? "";
                  const badgeIcon = subDef?.icon ?? catDef?.icon ?? "✦";
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className="group relative text-left rounded-[var(--radius-lg)] overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer flex flex-col bg-bg-tertiary/60"
                    >
                      {/* Zone héros : image ou halo + icône */}
                      <div className="relative h-[140px] overflow-hidden">
                        {e.main_image_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={e.main_image_url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-bg-tertiary/80" />
                          </>
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `radial-gradient(circle at 50% 55%, ${tone.glow} 0%, transparent 60%), linear-gradient(180deg, ${tone.bg} 0%, rgba(20,22,36,0.4) 100%)`,
                            }}
                          />
                        )}
                        {/* Icône centrale (si pas d'image) */}
                        {!e.main_image_url && (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-[38px]"
                            style={{ color: tone.text, opacity: 0.75 }}
                          >
                            {badgeIcon}
                          </div>
                        )}
                        {/* Badge catégorie, haut-gauche */}
                        <div
                          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 h-6 px-2 rounded-[var(--radius-sm)] text-[9.5px] font-medium uppercase backdrop-blur-sm"
                          style={{
                            letterSpacing: "0.14em",
                            background: tone.bg,
                            border: `1px solid ${tone.border}`,
                            color: tone.text,
                          }}
                        >
                          <span className="text-[11px] leading-none">{badgeIcon}</span>
                          <span>{badgeLabel}</span>
                        </div>
                      </div>

                      {/* Corps de carte */}
                      <div className="flex flex-col flex-1 p-3.5">
                        <div
                          className={`font-serif text-[18px] leading-tight ${
                            hasTitle ? "text-text-primary" : "italic text-text-quaternary"
                          }`}
                        >
                          {hasTitle ? e.title : "Sans titre"}
                        </div>
                        {e.subtitle && (
                          <div className="mt-0.5 text-[11px] text-text-tertiary font-serif italic">
                            {e.subtitle}
                          </div>
                        )}

                        {/* Aperçu : 2 champs clés ou description */}
                        {snippets.length > 0 ? (
                          <div className="mt-2.5 flex flex-col gap-1">
                            {snippets.slice(0, 2).map((s, i) => (
                              <div key={i} className="text-[11.5px] leading-snug flex gap-2">
                                <span className="text-text-quaternary shrink-0 w-[80px] truncate">
                                  {s.label}
                                </span>
                                <span className="text-text-secondary line-clamp-1">
                                  {s.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-[11.5px] italic text-text-quaternary font-serif">
                            Fiche vide — clique pour la renseigner
                          </div>
                        )}

                        <div className="flex-1" />

                        {/* Tags (discrets) */}
                        {e.tags && e.tags.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {e.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-[9.5px] px-1.5 py-0.5 bg-white/[0.03] text-text-tertiary rounded border border-white/[0.05]"
                              >
                                {t}
                              </span>
                            ))}
                            {e.tags.length > 3 && (
                              <span className="text-[9.5px] text-text-quaternary">
                                +{e.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer : date + statut */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.05]">
                          <span className="text-[10.5px] text-text-quaternary">
                            {new Date(e.updated_at).toLocaleDateString("fr-FR")}
                          </span>
                          <StatusChip status={e.status} />
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Carte « + Nouvelle fiche » en slot vide */}
                <button
                  onClick={() => {
                    if (activeCategory === "univers_monde") {
                      setShowSubtypeMenu(true);
                    } else if (activeCategory === "bestiaire") {
                      setShowBestiaireMenu(true);
                    } else {
                      createEntry();
                    }
                  }}
                  className="group relative rounded-[var(--radius-lg)] border border-dashed border-white/[0.08] hover:border-[var(--color-accent-border)] transition-colors cursor-pointer flex items-center justify-center min-h-[300px] bg-white/[0.01] hover:bg-white/[0.02]"
                >
                  <div className="flex flex-col items-center gap-2 text-text-quaternary group-hover:text-[var(--color-accent)] transition-colors">
                    <span className="flex items-center justify-center w-9 h-9 rounded-full border border-current text-[16px]">
                      +
                    </span>
                    <span className="text-[12px] font-serif italic">Nouvelle fiche</span>
                  </div>
                </button>
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

/* ========== Sub-components ========== */

function SubChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 inline-flex items-center gap-1.5 px-3 rounded-full text-[11.5px] cursor-pointer transition-colors border ${
        active
          ? "bg-[var(--color-accent-bg)] border-[var(--color-accent-border)] text-[var(--color-accent)]"
          : "bg-white/[0.02] border-white/[0.05] text-text-tertiary hover:text-text-primary hover:border-white/[0.1]"
      }`}
    >
      {icon && <span className="text-[12px] leading-none">{icon}</span>}
      {label}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-7 px-2 pr-6 bg-bg-secondary border border-white/[0.06] rounded-[var(--radius-sm)] text-[11px] text-text-secondary cursor-pointer disabled:opacity-40 hover:border-white/[0.1] appearance-none"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23737687' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function StatusChip({ status }: { status: WbStatus }) {
  if (status === "valide") {
    return (
      <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] bg-teal-bg/60 border border-teal-border/40 text-teal">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Validé
      </span>
    );
  }
  if (status === "archive") {
    return (
      <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] bg-white/[0.03] border border-white/[0.06] text-text-quaternary">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Archivé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.06] text-text-tertiary">
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      Brouillon
    </span>
  );
}

function IconGrid() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
      <rect x="7" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
      <rect x="1" y="7" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
      <rect x="7" y="7" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function IconTable() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="8" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
      <path d="M1 5H11M1 8H11M4 2V10" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** Petites intros éditoriales par catégorie (statique, purement décoratif). */
function universDescriptionFor(cat: string, projectTitle: string): string {
  const base = projectTitle || "votre univers";
  const map: Record<string, string> = {
    univers_monde: `Les fondations géographiques et politiques de ${base}.`,
    histoire_mythes: `Les récits fondateurs et mémoires de ${base}.`,
    societe_culture: `Les structures sociales, arts et institutions de ${base}.`,
    personnages: `Les figures qui peuplent ${base}.`,
    bestiaire: `Les créatures, bêtes et entités de ${base}.`,
    lexique_langage: `Les langues, jargons et parlers de ${base}.`,
    magie_divinites: `Les systèmes magiques et panthéons de ${base}.`,
    systeme_monetaire: `Économies, monnaies et échanges de ${base}.`,
    objets_legendaires: `Reliques, artefacts et objets singuliers de ${base}.`,
    lieux_maudits: `Les contrées où règne l'ombre dans ${base}.`,
    entites_malefiques: `Les forces hostiles qui hantent ${base}.`,
    codex_glossaire: `Références, notes et synthèses autour de ${base}.`,
    moodboard: `Ambiances visuelles et inspirations pour ${base}.`,
  };
  return map[cat] ?? `Notes de worldbuilding pour ${base}.`;
}
