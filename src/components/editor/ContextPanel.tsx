"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { getCategoryDef, UNIVERS_SUBTYPES, WB_CATEGORIES } from "@/lib/wb-constants";
import { getTemplate } from "@/lib/wb-templates";

const STATUS_CONFIG: Record<string, { variant: "teal" | "amber" | "muted" | "primary"; label: string }> = {
  a_ecrire: { variant: "muted", label: "À écrire" },
  premier_jet: { variant: "muted", label: "Premier jet" },
  revision: { variant: "amber", label: "Révision" },
  reecriture: { variant: "primary", label: "Réécriture" },
  correction: { variant: "teal", label: "Correction" },
  termine: { variant: "teal", label: "Terminé" },
};

const SCENE_STATUS: Record<string, { label: string; color: string }> = {
  todo: { label: "À faire", color: "bg-bg-hover text-text-tertiary" },
  in_progress: { label: "En cours", color: "bg-amber/15 text-amber" },
  done: { label: "Fait", color: "bg-[#1D9E75]/15 text-[#1D9E75]" },
};

const SCENE_STATUS_ORDER: string[] = ["todo", "in_progress", "done"];

interface SceneItem {
  id: string;
  chapter_id: string;
  title: string;
  position: number;
  status: string;
}

interface WbEntryLite {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  subcategory: string | null;
  main_image_url: string | null;
  status: string;
}

interface ChapterVersion {
  id: string;
  content: string;
  word_count: number;
  label: string | null;
  version: string | null;
  name: string | null;
  created_at: string;
}

interface WbEntryFull {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  subcategory: string | null;
  main_image_url: string | null;
  template_data: Record<string, unknown> | null;
  tags: string[] | null;
  personal_notes: string | null;
  status: string;
}

type TabKey = "info" | "scenes" | "world" | "versions";

export function ContextPanel({
  wordCount,
  paragraphCount,
  chapterTitle,
  chapterStatus,
  chapterId,
  onStatusChange,
  wbEntries,
  projectId,
  onSnapshot,
  onRestoreVersion,
}: {
  wordCount: number;
  paragraphCount: number;
  chapterTitle: string;
  chapterStatus: string;
  chapterId: string | null;
  onStatusChange: () => void;
  wbEntries: WbEntryLite[];
  projectId: string;
  onSnapshot: (name?: string) => void;
  onRestoreVersion: (content: string, wordCount: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [wbQuery, setWbQuery] = useState("");
  const [wbCategoryFilter, setWbCategoryFilter] = useState<string>("all");
  const [wbSelected, setWbSelected] = useState<WbEntryFull | null>(null);
  const [wbLoading, setWbLoading] = useState(false);
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabaseRef = useRef(createClient());

  const readingTime = Math.max(1, Math.round(wordCount / 250));
  const speakingTime = Math.max(1, Math.round(wordCount / 150));
  const s = STATUS_CONFIG[chapterStatus] ?? STATUS_CONFIG.a_ecrire;

  // Fetch scenes + synopsis when Scenes tab opens
  useEffect(() => {
    if (activeTab !== "scenes" || !chapterId) return;
    let cancelled = false;
    setLoadingScenes(true);

    Promise.all([
      supabaseRef.current
        .from("scenes")
        .select("id, chapter_id, title, position, status")
        .eq("chapter_id", chapterId)
        .order("position", { ascending: true }),
      supabaseRef.current
        .from("chapters")
        .select("synopsis")
        .eq("id", chapterId)
        .single(),
    ]).then(([scenesRes, chapterRes]) => {
      if (!cancelled) {
        setScenes(scenesRes.data ?? []);
        setSynopsis(chapterRes.data?.synopsis ?? null);
        setLoadingScenes(false);
      }
    });

    return () => { cancelled = true; };
  }, [activeTab, chapterId]);

  // Fetch versions when Versions tab opens (or chapter changes)
  useEffect(() => {
    if (activeTab !== "versions" || !chapterId) return;
    let cancelled = false;
    setLoadingVersions(true);
    supabaseRef.current
      .from("chapter_versions")
      .select("id, content, word_count, label, version, name, created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          setVersions((data ?? []) as ChapterVersion[]);
          setPreviewVersionId(null);
          setLoadingVersions(false);
        }
      });
    return () => { cancelled = true; };
  }, [activeTab, chapterId]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  /* ---- Scene CRUD ---- */
  async function addScene() {
    if (!chapterId) return;
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxPos = scenes.reduce((m, sc) => Math.max(m, sc.position), -1);

    const { data } = await supabase
      .from("scenes")
      .insert({
        chapter_id: chapterId,
        user_id: user.id,
        title: `Scène ${scenes.length + 1}`,
        position: maxPos + 1,
      })
      .select("id, chapter_id, title, position, status")
      .single();

    if (data) setScenes((prev) => [...prev, data as SceneItem]);
  }

  async function renameScene(sceneId: string, title: string) {
    setScenes((prev) => prev.map((sc) => (sc.id === sceneId ? { ...sc, title } : sc)));
    setEditingId(null);
    await supabaseRef.current.from("scenes").update({ title }).eq("id", sceneId);
  }

  async function deleteScene(sceneId: string) {
    setScenes((prev) => prev.filter((sc) => sc.id !== sceneId));
    await supabaseRef.current.from("scenes").delete().eq("id", sceneId);
  }

  async function reorderScenes(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const sorted = [...scenes].sort((a, b) => a.position - b.position);
    const fromIdx = sorted.findIndex((sc) => sc.id === draggedId);
    const toIdx = sorted.findIndex((sc) => sc.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const item = sorted[fromIdx];
    sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, item);
    const updated = sorted.map((sc, i) => ({ ...sc, position: i }));
    setScenes(updated);
    const supabase = supabaseRef.current;
    await Promise.all(
      updated.map((sc) =>
        supabase.from("scenes").update({ position: sc.position }).eq("id", sc.id)
      )
    );
  }

  async function cycleSceneStatus(sceneId: string) {
    const scene = scenes.find((sc) => sc.id === sceneId);
    if (!scene) return;
    const idx = SCENE_STATUS_ORDER.indexOf(scene.status);
    const next = SCENE_STATUS_ORDER[(idx + 1) % SCENE_STATUS_ORDER.length];
    setScenes((prev) => prev.map((sc) => (sc.id === sceneId ? { ...sc, status: next } : sc)));
    await supabaseRef.current.from("scenes").update({ status: next }).eq("id", sceneId);
  }

  async function deleteVersion(id: string) {
    setVersions((prev) => prev.filter((v) => v.id !== id));
    await supabaseRef.current.from("chapter_versions").delete().eq("id", id);
  }

  function triggerManualSnapshot() {
    const name = window.prompt("Nom de la version (optionnel) :", "");
    if (name === null) return; // annulé
    onSnapshot(name || undefined);
    // Re-fetch versions after a moment
    if (!chapterId) return;
    setTimeout(() => {
      supabaseRef.current
        .from("chapter_versions")
        .select("id, content, word_count, label, version, name, created_at")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => setVersions((data ?? []) as ChapterVersion[]));
    }, 400);
  }

  // On exclut le moodboard de l'onglet World (pas une fiche de contenu)
  const wbEntriesForTab = wbEntries.filter((e) => e.category !== "moodboard");

  const wbFiltered = wbEntriesForTab.filter((e) => {
    if (wbCategoryFilter !== "all" && e.category !== wbCategoryFilter) return false;
    if (!wbQuery.trim()) return true;
    const q = wbQuery.toLowerCase();
    return (
      (e.title ?? "").toLowerCase().includes(q) ||
      (e.subtitle ?? "").toLowerCase().includes(q)
    );
  });

  // Catégories présentes (hors moodboard)
  const wbCategoriesInUse = Array.from(new Set(wbEntriesForTab.map((e) => e.category)));
  const wbCategoryOptions = WB_CATEGORIES.filter(
    (c) => c.key !== "moodboard" && wbCategoriesInUse.includes(c.key)
  );

  async function loadWbEntry(entryId: string) {
    setWbLoading(true);
    const { data } = await supabaseRef.current
      .from("wb_entries")
      .select(
        "id, title, subtitle, description, category, subcategory, main_image_url, template_data, tags, personal_notes, status"
      )
      .eq("id", entryId)
      .single();
    if (data) setWbSelected(data as WbEntryFull);
    setWbLoading(false);
  }

  // Ouvrir la fiche complète dans un nouvel onglet
  function openWbEntryFull(entryId: string) {
    const url = `/wb/${projectId}?entry=${entryId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "scenes", label: "Scènes" },
    { key: "world", label: "World" },
    { key: "versions", label: "Versions" },
  ];

  return (
    <div className="h-full border-l border-border bg-bg-secondary flex flex-col">
      {/* Tabs */}
      <div className="flex gap-0.5 px-2.5 pt-2.5 pb-1.5 border-b border-border shrink-0 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`text-[11px] px-1.5 py-0.5 rounded font-medium border cursor-pointer transition-colors ${
              activeTab === t.key
                ? "bg-primary-bg text-primary-dark border-primary-border"
                : "bg-transparent text-text-tertiary border-transparent hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {activeTab === "info" && (
          <>
            <div className="mb-2">
              <div className="text-[11px] font-medium text-text-tertiary mb-1">CHAPITRE</div>
              <div className="text-[12px] text-text-secondary font-medium">{chapterTitle}</div>
            </div>

            <div className="mb-2">
              <div className="text-[11px] font-medium text-text-tertiary mb-1">STATUT</div>
              <button
                onClick={onStatusChange}
                title="Cliquez pour changer le statut"
                className="cursor-pointer border-none bg-transparent p-0"
              >
                <Badge variant={s.variant}>{s.label}</Badge>
              </button>
            </div>

            <div>
              <div className="text-[11px] font-medium text-text-tertiary mb-1">STATS</div>
              <div className="text-[12px] text-text-secondary leading-relaxed">
                <div>{wordCount.toLocaleString("fr-FR")} mots</div>
                <div>{paragraphCount} §</div>
                <div>{readingTime} min lecture</div>
                <div>{speakingTime} min voix haute</div>
              </div>
            </div>
          </>
        )}

        {activeTab === "scenes" && (
          <>
            {!chapterId ? (
              <div className="text-[12px] text-text-quaternary italic">
                Sélectionnez un chapitre
              </div>
            ) : loadingScenes ? (
              <div className="text-[12px] text-text-quaternary italic">Chargement…</div>
            ) : (
              <>
                <div className="mb-2">
                  <div className="text-[10px] font-medium text-text-quaternary uppercase tracking-wider mb-0.5">Résumé</div>
                  <div className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {synopsis || <span className="italic text-text-quaternary">Aucun résumé</span>}
                  </div>
                </div>

                <div className="border-t border-border pt-2 mb-1">
                  <div className="text-[10px] font-medium text-text-quaternary uppercase tracking-wider mb-1">Scènes</div>
                </div>

                {scenes.length === 0 ? (
                  <div className="text-[12px] text-text-quaternary italic mb-2">
                    Aucune scène pour ce chapitre
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 mb-2">
                    {scenes
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((scene) => {
                      const statusInfo = SCENE_STATUS[scene.status] ?? SCENE_STATUS.todo;
                      const isDragging = dragSceneId === scene.id;
                      const isOver = dragOverSceneId === scene.id && dragSceneId !== scene.id;
                      return (
                        <div
                          key={scene.id}
                          draggable={editingId !== scene.id}
                          onDragStart={(ev) => {
                            setDragSceneId(scene.id);
                            ev.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(ev) => {
                            ev.preventDefault();
                            ev.dataTransfer.dropEffect = "move";
                            if (dragOverSceneId !== scene.id) setDragOverSceneId(scene.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverSceneId === scene.id) setDragOverSceneId(null);
                          }}
                          onDrop={(ev) => {
                            ev.preventDefault();
                            if (dragSceneId) reorderScenes(dragSceneId, scene.id);
                            setDragSceneId(null);
                            setDragOverSceneId(null);
                          }}
                          onDragEnd={() => {
                            setDragSceneId(null);
                            setDragOverSceneId(null);
                          }}
                          className={`group flex items-center gap-1 px-1.5 py-1 rounded-[var(--radius-sm)] transition-colors ${
                            isDragging
                              ? "opacity-40"
                              : isOver
                                ? "bg-primary-bg/60 border border-primary-border"
                                : "hover:bg-bg-hover/50 border border-transparent"
                          } ${editingId === scene.id ? "cursor-text" : "cursor-grab active:cursor-grabbing"}`}
                        >
                          <span
                            className="shrink-0 text-[10px] text-text-quaternary select-none opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Glisser pour réordonner"
                          >
                            ⋮⋮
                          </span>
                          {editingId === scene.id ? (
                            <input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                if (editValue.trim() && editValue.trim() !== scene.title) renameScene(scene.id, editValue.trim());
                                else setEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editValue.trim() && editValue.trim() !== scene.title) renameScene(scene.id, editValue.trim());
                                  else setEditingId(null);
                                }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="flex-1 px-1 py-0.5 text-[11px] border border-primary-border rounded bg-bg-primary text-text-primary outline-none"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => { setEditingId(scene.id); setEditValue(scene.title); }}
                              className="flex-1 text-[11px] text-text-secondary truncate cursor-default"
                              title={scene.title}
                            >
                              {scene.title}
                            </span>
                          )}

                          <button
                            onClick={() => cycleSceneStatus(scene.id)}
                            className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </button>

                          <button
                            onClick={() => deleteScene(scene.id)}
                            className="hidden group-hover:flex w-3.5 h-3.5 items-center justify-center text-[9px] text-text-quaternary hover:text-red cursor-pointer border-none bg-transparent shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={addScene}
                  className="text-[11px] text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent transition-colors"
                >
                  + Scène
                </button>
              </>
            )}
          </>
        )}

        {activeTab === "world" && (
          <>
            {wbSelected ? (
              <WbEntryPreview
                entry={wbSelected}
                loading={wbLoading}
                onBack={() => setWbSelected(null)}
                onOpenFull={() => openWbEntryFull(wbSelected.id)}
              />
            ) : (
              <>
                <div className="flex flex-col gap-1.5 mb-2">
                  <select
                    value={wbCategoryFilter}
                    onChange={(e) => setWbCategoryFilter(e.target.value)}
                    className="w-full text-[11px] px-2 py-1 bg-bg-primary border border-border rounded cursor-pointer focus:outline-none focus:border-primary"
                  >
                    <option value="all">📂 Toutes les catégories ({wbEntriesForTab.length})</option>
                    {wbCategoryOptions.map((c) => {
                      const n = wbEntriesForTab.filter((e) => e.category === c.key).length;
                      return (
                        <option key={c.key} value={c.key}>
                          {c.icon} {c.label} ({n})
                        </option>
                      );
                    })}
                  </select>
                  <input
                    value={wbQuery}
                    onChange={(e) => setWbQuery(e.target.value)}
                    placeholder="Rechercher…"
                    className="w-full text-[11px] px-2 py-1 bg-bg-primary border border-border rounded focus:outline-none focus:border-primary"
                  />
                </div>

                {wbFiltered.length === 0 ? (
                  <div className="text-[11px] italic text-text-quaternary">
                    {wbEntriesForTab.length === 0
                      ? "Aucune fiche dans le World Building."
                      : "Aucun résultat."}
                  </div>
                ) : (
                  <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(0, 150px))" }}>
                    {wbFiltered.slice(0, 40).map((e) => {
                      const cat = getCategoryDef(e.category);
                      const sub =
                        e.category === "univers_monde" && e.subcategory
                          ? UNIVERS_SUBTYPES.find((st) => st.key === e.subcategory)
                          : null;
                      const hasTitle = (e.title ?? "").trim().length > 0;
                      return (
                        <button
                          key={e.id}
                          onClick={() => loadWbEntry(e.id)}
                          title={e.title || "Sans titre"}
                          className="group relative text-left rounded-md overflow-hidden border border-border hover:border-primary transition-all cursor-pointer flex flex-col aspect-square bg-bg-primary shadow-sm"
                        >
                          {e.main_image_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={e.main_image_url}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary to-bg-primary" />
                          )}

                          <div className="relative z-10 flex flex-col h-full p-1.5">
                            <div className="text-[8px] uppercase tracking-wider text-white/80 flex items-center gap-0.5 drop-shadow">
                              <span>{sub?.icon ?? cat?.icon}</span>
                              <span className="truncate">{sub?.label ?? cat?.label}</span>
                            </div>
                            <div className="flex-1" />
                            <div
                              className={`text-[11px] font-semibold leading-tight drop-shadow-lg line-clamp-2 ${
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
                              <div className="text-[9px] text-white/70 drop-shadow truncate">
                                {e.subtitle}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "versions" && (
          <>
            {!chapterId ? (
              <div className="text-[11px] italic text-text-quaternary">
                Sélectionnez un chapitre
              </div>
            ) : (
              <>
                <button
                  onClick={triggerManualSnapshot}
                  className="w-full text-[11px] text-primary border border-primary-border rounded px-2 py-1 bg-transparent cursor-pointer hover:bg-primary-bg transition-colors mb-2"
                >
                  📸 Créer une version maintenant
                </button>

                {loadingVersions ? (
                  <div className="text-[11px] italic text-text-quaternary">Chargement…</div>
                ) : versions.length === 0 ? (
                  <div className="text-[11px] italic text-text-quaternary">
                    Aucune version enregistrée. Une version est créée automatiquement à chaque changement de chapitre.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {versions.map((v) => {
                      const isPreview = previewVersionId === v.id;
                      const d = new Date(v.created_at);
                      return (
                        <div
                          key={v.id}
                          className={`border rounded p-1.5 ${
                            isPreview ? "border-primary bg-primary-bg/30" : "border-border"
                          }`}
                        >
                          <button
                            onClick={() => setPreviewVersionId(isPreview ? null : v.id)}
                            className="w-full text-left cursor-pointer bg-transparent border-none p-0"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {v.version && (
                                <span className="text-[10px] font-mono text-primary bg-primary-bg px-1 py-0.5 rounded">
                                  v{v.version}
                                </span>
                              )}
                              <span className="text-[11px] text-text-primary font-medium truncate">
                                {v.name || d.toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="text-[9px] text-text-tertiary">
                              {d.toLocaleDateString("fr-FR")}{" "}
                              {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}
                              {v.word_count.toLocaleString("fr-FR")} mots
                              {v.label ? ` · ${v.label}` : ""}
                            </div>
                          </button>

                          {isPreview && (
                            <div className="mt-1.5 border-t border-border pt-1.5">
                              <div
                                className="text-[10px] text-text-secondary max-h-24 overflow-y-auto bg-bg-primary rounded p-1 border border-border leading-snug"
                                dangerouslySetInnerHTML={{
                                  __html:
                                    v.content.length > 600
                                      ? v.content.slice(0, 600) + "…"
                                      : v.content,
                                }}
                              />
                              <div className="flex gap-1 mt-1.5">
                                <button
                                  onClick={() => {
                                    if (confirm("Restaurer cette version ? Le contenu actuel sera automatiquement sauvegardé avant.")) {
                                      onRestoreVersion(v.content, v.word_count);
                                      setPreviewVersionId(null);
                                    }
                                  }}
                                  className="text-[10px] flex-1 text-primary border border-primary-border rounded px-1.5 py-0.5 bg-transparent cursor-pointer hover:bg-primary-bg transition-colors"
                                >
                                  Restaurer
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Supprimer cette version ?")) deleteVersion(v.id);
                                  }}
                                  className="text-[10px] text-text-tertiary hover:text-red cursor-pointer border border-border rounded px-1.5 py-0.5 bg-transparent transition-colors"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Preview inline d'une fiche WB dans le panneau ---------- */
function WbEntryPreview({
  entry,
  loading,
  onBack,
  onOpenFull,
}: {
  entry: WbEntryFull;
  loading: boolean;
  onBack: () => void;
  onOpenFull: () => void;
}) {
  const cat = getCategoryDef(entry.category);
  const sub =
    entry.category === "univers_monde" && entry.subcategory
      ? UNIVERS_SUBTYPES.find((st) => st.key === entry.subcategory)
      : null;
  const template = getTemplate(entry.category, entry.subcategory);

  // Map key -> label via template (si présent)
  const labelByKey: Record<string, string> = {};
  if (template) {
    for (const section of template.sections) {
      for (const f of section.fields) labelByKey[f.key] = f.label;
    }
  }

  const tdata = entry.template_data ?? {};
  const tdataEntries = Object.entries(tdata).filter(
    ([, v]) => typeof v === "string" && (v as string).trim().length > 0
  ) as [string, string][];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="text-[11px] text-text-tertiary hover:text-primary cursor-pointer bg-transparent border-none flex items-center gap-1"
        >
          ← Retour
        </button>
        <button
          onClick={onOpenFull}
          title="Ouvrir la fiche complète dans un nouvel onglet"
          className="text-[10px] text-primary border border-primary-border rounded px-1.5 py-0.5 bg-transparent cursor-pointer hover:bg-primary-bg transition-colors"
        >
          ↗ Ouvrir
        </button>
      </div>

      {loading && (
        <div className="text-[11px] italic text-text-quaternary">Chargement…</div>
      )}

      {entry.main_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.main_image_url}
          alt=""
          className="w-full aspect-video object-cover rounded border border-border"
        />
      )}

      <div>
        <div className="text-[9px] uppercase tracking-wider text-text-quaternary flex items-center gap-1">
          <span>{sub?.icon ?? cat?.icon}</span>
          <span>{sub?.label ?? cat?.label}</span>
        </div>
        <div className="text-[14px] font-semibold text-text-primary leading-tight mt-0.5">
          {entry.title || <span className="italic text-text-quaternary">Sans titre</span>}
        </div>
        {entry.subtitle && (
          <div className="text-[11px] text-text-tertiary mt-0.5">{entry.subtitle}</div>
        )}
      </div>

      {entry.description && entry.description.trim() && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-0.5">
            Description
          </div>
          <div className="text-[11px] text-text-secondary leading-snug whitespace-pre-wrap">
            {entry.description}
          </div>
        </div>
      )}

      {tdataEntries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tdataEntries.map(([k, v]) => (
            <div key={k}>
              <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-0.5">
                {labelByKey[k] ?? k}
              </div>
              <div className="text-[11px] text-text-secondary leading-snug whitespace-pre-wrap">
                {v}
              </div>
            </div>
          ))}
        </div>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="text-[9px] px-1.5 py-0.5 bg-primary-bg text-primary-dark rounded"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {entry.personal_notes && entry.personal_notes.trim() && (
        <div className="border-t border-border pt-2">
          <div className="text-[9px] uppercase tracking-wider text-text-quaternary mb-0.5">
            💬 Notes personnelles
          </div>
          <div className="text-[11px] text-text-secondary leading-snug whitespace-pre-wrap italic">
            {entry.personal_notes}
          </div>
        </div>
      )}
    </div>
  );
}
