"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { appConfirm } from "@/lib/app-confirm";
import {
  getCategoryDef,
  UNIVERS_SUBTYPES,
  WB_CATEGORIES,
} from "@/lib/wb-constants";
import { WbEntryPanel } from "@/components/wb/WbEntryPanel";
import { RichEditableCell } from "@/components/planning/RichEditableCell";
import { ThemePills } from "@/components/planning/ThemePills";

function stripHtml(s: string): string {
  return (s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}


// Badge de scène aligné sur le style du fil d'Ariane (dot + pilule)
const SCENE_STATUS_BADGE: Record<string, {
  label: string; dot: string; text: string; bg: string; border: string;
}> = {
  todo:        { label: "À faire",   dot: "#7a7163", text: "#a89e8d", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
  in_progress: { label: "En cours",  dot: "#EF9F27", text: "#f0b254", bg: "rgba(239,159,39,0.10)",  border: "rgba(239,159,39,0.28)" },
  done:        { label: "Fait",      dot: "#1D9E75", text: "#5cc2a0", bg: "rgba(29,158,117,0.10)",  border: "rgba(29,158,117,0.28)" },
};

const SCENE_STATUS_ORDER: string[] = ["todo", "in_progress", "done"];

// Colonnes du chapitrage exposées dans l'onglet Scènes (hors synopsis et themes rendus à part).
// Libellés strictement alignés sur ceux du tableau de chapitrage (ChapterTable.DEFAULT_COLUMNS).
const CHAPTER_TEXT_FIELDS: { key: keyof ChapterFields; label: string }[] = [
  { key: "plot_elements", label: "Éléments intrigue globale" },
  { key: "minor_elements", label: "Éléments mineurs/ambiances" },
  { key: "observations", label: "Observations / remarques" },
  { key: "tension_indices", label: "Indices/tension relative" },
  { key: "pivot", label: "Bascule" },
  { key: "narrative_knot", label: "Nœud narratif" },
];

interface ChapterFields {
  synopsis: string | null;
  themes: string[];
  plot_elements: string | null;
  minor_elements: string | null;
  observations: string | null;
  tension_indices: string | null;
  pivot: string | null;
  narrative_knot: string | null;
}

interface CustomColumn {
  id: string;
  name: string;
  type: string;
  position: number;
}

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
  charCount,
  charCountNoSpaces,
  chapterStatus,
  chapterId,
  novelId,
  onStatusChange,
  wbEntries,
  projectId,
  onSnapshot,
  onRestoreVersion,
}: {
  wordCount: number;
  paragraphCount: number;
  charCount: number;
  charCountNoSpaces: number;
  chapterStatus: string;
  chapterId: string | null;
  novelId: string;
  onStatusChange: () => void;
  wbEntries: WbEntryLite[];
  projectId: string;
  onSnapshot: (name?: string) => void;
  onRestoreVersion: (content: string, wordCount: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [chapterFields, setChapterFields] = useState<ChapterFields>({
    synopsis: null, themes: [], plot_elements: null,
    minor_elements: null, observations: null, tension_indices: null,
    pivot: null, narrative_knot: null,
  });
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({}); // column_id -> value
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [wbQuery, setWbQuery] = useState("");
  const [wbCategoryFilter, setWbCategoryFilter] = useState<string>("all");
  const [wbSelected, setWbSelected] = useState<WbEntryFull | null>(null);
  const [wbLoading, setWbLoading] = useState(false);
  // Fiches créées depuis le panel éditeur (non encore rafraîchies côté serveur).
  const [extraWbEntries, setExtraWbEntries] = useState<WbEntryLite[]>([]);
  // ID de la dernière fiche créée — sert à ouvrir directement en mode édition.
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  // Menu déroulant « + Nouvelle fiche » ouvert ?
  const [creatingMenu, setCreatingMenu] = useState(false);
  // Scope de la vue World : fiches liées au chapitre vs bibliothèque complète.
  const [wbScope, setWbScope] = useState<"linked" | "all">("linked");
  // IDs des fiches liées au chapitre courant (via chapter_entries)
  const [linkedEntryIds, setLinkedEntryIds] = useState<Set<string>>(new Set());
  // Picker overlay : catégorie active (null = fermé)
  const [pickerCategory, setPickerCategory] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [renameVersionDraft, setRenameVersionDraft] = useState("");
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabaseRef = useRef(createClient());

  const readingTime = Math.max(1, Math.round(wordCount / 250));
  const speakingTime = Math.max(1, Math.round(wordCount / 150));

  // Fetch scenes + synopsis when Scenes tab opens (also Info, pour thème + nœud narratif)
  useEffect(() => {
    if ((activeTab !== "scenes" && activeTab !== "info") || !chapterId) return;
    let cancelled = false;
    // Flash de loading avant fetch : défér dans une microtask pour éviter
    // le re-render cascadé signalé par react-hooks/set-state-in-effect.
    Promise.resolve().then(() => { if (!cancelled) setLoadingScenes(true); });

    Promise.all([
      supabaseRef.current
        .from("scenes")
        .select("id, chapter_id, title, position, status")
        .eq("chapter_id", chapterId)
        .order("position", { ascending: true }),
      supabaseRef.current
        .from("chapters")
        .select("synopsis, themes, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot")
        .eq("id", chapterId)
        .single(),
      supabaseRef.current
        .from("planning_columns")
        .select("id, name, type, position")
        .eq("novel_id", novelId)
        .order("position", { ascending: true }),
      supabaseRef.current
        .from("planning_cell_values")
        .select("column_id, value")
        .eq("chapter_id", chapterId),
    ]).then(([scenesRes, chapterRes, columnsRes, valuesRes]) => {
      if (!cancelled) {
        setScenes(scenesRes.data ?? []);
        const c = (chapterRes.data ?? {}) as Partial<ChapterFields>;
        setChapterFields({
          synopsis: c.synopsis ?? null,
          themes: Array.isArray(c.themes) ? c.themes : [],
          plot_elements: c.plot_elements ?? null,
          minor_elements: c.minor_elements ?? null,
          observations: c.observations ?? null,
          tension_indices: c.tension_indices ?? null,
          pivot: c.pivot ?? null,
          narrative_knot: c.narrative_knot ?? null,
        });
        setCustomColumns((columnsRes.data ?? []) as CustomColumn[]);
        const vmap: Record<string, string> = {};
        for (const row of (valuesRes.data ?? []) as { column_id: string; value: string | null }[]) {
          if (row.value != null) vmap[row.column_id] = row.value;
        }
        setCustomValues(vmap);
        setLoadingScenes(false);
      }
    });

    return () => { cancelled = true; };
  }, [activeTab, chapterId, novelId]);

  // Fetch versions when Versions tab opens (or chapter changes)
  useEffect(() => {
    if (activeTab !== "versions" || !chapterId) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) setLoadingVersions(true); });
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

  /* ---- Fetch chapter_entries (fiches liées à ce chapitre) ---- */
  useEffect(() => {
    let cancelled = false;
    if (!chapterId) {
      // Reset en cas de désélection
      supabaseRef.current
        .from("chapter_entries")
        .select("entry_id")
        .eq("chapter_id", "00000000-0000-0000-0000-000000000000")
        .then(() => {
          if (!cancelled) setLinkedEntryIds(new Set());
        });
      return () => { cancelled = true; };
    }
    supabaseRef.current
      .from("chapter_entries")
      .select("entry_id")
      .eq("chapter_id", chapterId)
      .then(({ data }) => {
        if (cancelled) return;
        const ids = new Set((data ?? []).map((r: { entry_id: string }) => r.entry_id));
        setLinkedEntryIds(ids);
        // Si aucune fiche liée, bascule automatiquement sur "Toutes"
        if (ids.size === 0) setWbScope("all");
      });
    return () => { cancelled = true; };
  }, [chapterId]);

  async function linkWbEntry(entryId: string) {
    if (!chapterId) return;
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Optimiste
    setLinkedEntryIds((prev) => {
      if (prev.has(entryId)) return prev;
      const next = new Set(prev);
      next.add(entryId);
      return next;
    });
    await supabase
      .from("chapter_entries")
      .insert({ chapter_id: chapterId, entry_id: entryId, user_id: user.id });
  }

  async function unlinkWbEntry(entryId: string) {
    if (!chapterId) return;
    setLinkedEntryIds((prev) => {
      if (!prev.has(entryId)) return prev;
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    await supabaseRef.current
      .from("chapter_entries")
      .delete()
      .eq("chapter_id", chapterId)
      .eq("entry_id", entryId);
  }

  /* ---- Chapter fields (chapitrage exposé) ---- */
  async function saveChapterField(field: keyof ChapterFields, value: string | null) {
    if (!chapterId) return;
    const dbVal = value === "" ? null : value;
    setChapterFields((prev) => ({ ...prev, [field]: dbVal }));
    await supabaseRef.current.from("chapters").update({ [field]: dbVal }).eq("id", chapterId);
  }

  async function saveChapterThemes(next: string[]) {
    if (!chapterId) return;
    setChapterFields((prev) => ({ ...prev, themes: next }));
    await supabaseRef.current.from("chapters").update({ themes: next }).eq("id", chapterId);
  }

  async function saveCustomValue(columnId: string, value: string) {
    if (!chapterId) return;
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCustomValues((prev) => {
      const next = { ...prev };
      if (value === "") delete next[columnId];
      else next[columnId] = value;
      return next;
    });
    await supabase.from("planning_cell_values").upsert(
      { column_id: columnId, chapter_id: chapterId, user_id: user.id, value: value || null },
      { onConflict: "column_id,chapter_id" }
    );
  }

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

  async function renameVersion(id: string, name: string) {
    const trimmed = name.trim();
    setVersions((prev) => prev.map((v) => (v.id === id ? { ...v, name: trimmed || null } : v)));
    setRenamingVersionId(null);
    await supabaseRef.current
      .from("chapter_versions")
      .update({ name: trimmed || null })
      .eq("id", id);
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

  // Union prop + fiches créées localement depuis le panel (optimistes).
  const allWb: WbEntryLite[] = [...extraWbEntries, ...wbEntries];
  // On exclut le moodboard de l'onglet World (pas une fiche de contenu)
  const wbEntriesForTab = allWb.filter((e) => e.category !== "moodboard");

  // Catégories présentes (hors moodboard)
  const wbCategoriesInUse = Array.from(new Set(wbEntriesForTab.map((e) => e.category)));
  const wbCategoryOptions = WB_CATEGORIES.filter(
    (c) => c.key !== "moodboard" && wbCategoriesInUse.includes(c.key)
  );

  // Catégories disponibles à la création (toutes sauf moodboard).
  // On ne filtre pas par genre ici : dans le doute, on laisse tout ouvrir
  // depuis l'éditeur — le panel sert à capturer une idée sans friction.
  const wbCreatableCategories = WB_CATEGORIES.filter((c) => c.key !== "moodboard");

  function defaultSubtypeFor(category: string): string | null {
    if (category === "univers_monde") return "pays";
    if (category === "magie_divinites") return "dieu";
    if (category === "systeme_monetaire") return "monnaie";
    return null;
  }

  async function createWbEntry(category: string, subcategory: string | null) {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("wb_entries")
      .insert({
        project_id: projectId,
        user_id: user.id,
        category,
        subcategory,
        title: "",
        status: "brouillon",
      })
      .select("id, title, subtitle, description, category, subcategory, main_image_url, template_data, tags, personal_notes, status")
      .single();
    if (error || !data) return;
    const full = data as WbEntryFull;
    const lite: WbEntryLite = {
      id: full.id,
      title: full.title,
      subtitle: full.subtitle,
      category: full.category,
      subcategory: full.subcategory,
      main_image_url: full.main_image_url,
      status: full.status,
    };
    // Optimiste : ajoute à la liste locale pour que la fiche apparaisse
    // immédiatement dans le panel (et persiste même si on revient à la liste).
    setExtraWbEntries((prev) => [lite, ...prev]);
    // Auto-link au chapitre courant si présent — confort d'usage.
    if (chapterId) {
      setLinkedEntryIds((prev) => {
        const next = new Set(prev);
        next.add(full.id);
        return next;
      });
      await supabase
        .from("chapter_entries")
        .insert({ chapter_id: chapterId, entry_id: full.id, user_id: user.id });
    }
    // Ouvre la fiche directement en mode édition.
    setJustCreatedId(full.id);
    setWbSelected(full);
    setCreatingMenu(false);
  }

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

  // Couleurs pill État (alignées sur le fil d'Ariane éditeur)
  const STATUS_BADGE: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
    a_ecrire:    { label: "À écrire",    dot: "#7a7163", text: "#a89e8d", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
    premier_jet: { label: "Premier jet", dot: "#7B6FDE", text: "#b5acef", bg: "rgba(123,111,222,0.10)", border: "rgba(123,111,222,0.28)" },
    revision:    { label: "Révision",    dot: "#EF9F27", text: "#f0b254", bg: "rgba(239,159,39,0.10)",   border: "rgba(239,159,39,0.28)" },
    reecriture:  { label: "Réécriture",  dot: "#e4b48c", text: "#eec19b", bg: "rgba(228,180,140,0.10)",  border: "rgba(228,180,140,0.28)" },
    correction:  { label: "Correction",  dot: "#5DCAA5", text: "#7ed8b7", bg: "rgba(93,202,165,0.10)",   border: "rgba(93,202,165,0.28)" },
    termine:     { label: "Terminé",     dot: "#1D9E75", text: "#5cc2a0", bg: "rgba(29,158,117,0.10)",   border: "rgba(29,158,117,0.28)" },
  };
  const statusBadge = STATUS_BADGE[chapterStatus] ?? STATUS_BADGE.a_ecrire;
  const knotText = stripHtml(chapterFields.narrative_knot ?? "");

  return (
    <div className="h-full border-l border-white/[0.05] bg-bg-secondary flex flex-col">
      {/* Tabs — onglets à soulignement */}
      <div className="flex items-center gap-5 px-5 pt-4 border-b border-white/[0.05] shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative pb-2.5 text-[12.5px] cursor-pointer bg-transparent border-none transition-colors ${
              activeTab === t.key
                ? "text-[var(--color-accent)] font-medium"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <span
                className="absolute left-0 right-0 bottom-[-1px] h-[2px] rounded-full"
                style={{ background: "var(--color-accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {activeTab === "info" && (
          <>
            {/* ---- STATUT DU CHAPITRE ---- */}
            <SectionHeader>Statut du chapitre</SectionHeader>
            <div className="flex flex-col gap-px mb-6 rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-tertiary/40 overflow-hidden">
              <InfoRow label="État">
                <button
                  onClick={onStatusChange}
                  title="Cliquer pour changer le statut"
                  className="inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full cursor-pointer transition-colors"
                  style={{ background: statusBadge.bg, border: `1px solid ${statusBadge.border}`, color: statusBadge.text }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusBadge.dot }} />
                  <span className="text-[11px] font-medium">{statusBadge.label}</span>
                </button>
              </InfoRow>
              <InfoRow label="Thèmes">
                <div className="flex-1 -my-1 -mr-2">
                  <ThemePills
                    themes={chapterFields.themes}
                    onChange={saveChapterThemes}
                    compact
                  />
                </div>
              </InfoRow>
              <InfoRow label="Nœud narratif">
                {knotText ? (
                  <span className="text-[12.5px] text-text-primary">{knotText}</span>
                ) : (
                  <span className="text-[12px] italic text-text-quaternary">—</span>
                )}
              </InfoRow>
            </div>

            {/* ---- COMPTEUR ---- */}
            <SectionHeader>Compteur</SectionHeader>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <StatCard label="Mots" value={wordCount.toLocaleString("fr-FR")} />
              <StatCard
                label="Signes"
                value={charCountNoSpaces.toLocaleString("fr-FR")}
                hint={`esp. ${charCount.toLocaleString("fr-FR")}`}
              />
              <StatCard label="Paragraphes" value={paragraphCount.toString()} />
              <StatCard
                label="Lecture"
                value={`${readingTime} min`}
                hint={`voix : ${speakingTime} min`}
              />
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
                {/* ---- CHAPITRAGE ---- */}
                <SectionHeader>Chapitrage</SectionHeader>
                <div className="rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-tertiary/40 overflow-hidden mb-6">
                  <FieldBlock label="Résumé du Chapitre">
                    <RichEditableCell
                      value={chapterFields.synopsis ?? ""}
                      onSave={(val) => saveChapterField("synopsis", val)}
                    />
                  </FieldBlock>
                  <FieldBlock label="Thème" padY="tight">
                    <ThemePills
                      themes={chapterFields.themes}
                      onChange={saveChapterThemes}
                      compact
                    />
                  </FieldBlock>
                  {CHAPTER_TEXT_FIELDS.map(({ key, label }) => (
                    <FieldBlock key={key} label={label}>
                      <RichEditableCell
                        value={(chapterFields[key] as string | null) ?? ""}
                        onSave={(val) => saveChapterField(key, val)}
                      />
                    </FieldBlock>
                  ))}
                  {customColumns.map((col) => (
                    <FieldBlock key={col.id} label={col.name}>
                      <RichEditableCell
                        value={customValues[col.id] ?? ""}
                        onSave={(val) => saveCustomValue(col.id, val)}
                      />
                    </FieldBlock>
                  ))}
                </div>

                {/* ---- SCÈNES ---- */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="text-[10px] font-medium text-text-quaternary uppercase"
                    style={{ letterSpacing: "0.18em" }}
                  >
                    Scènes{scenes.length > 0 && <span className="text-text-quaternary/60"> · {scenes.length}</span>}
                  </div>
                  <button
                    onClick={addScene}
                    className="ml-auto inline-flex items-center gap-1 h-6 px-2 rounded-full border border-white/[0.08] bg-bg-tertiary/60 text-text-tertiary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer transition-colors text-[11px]"
                    title="Ajouter une scène"
                  >
                    <span className="text-[12px] leading-none">+</span>
                    Scène
                  </button>
                </div>

                {scenes.length === 0 ? (
                  <div className="text-[11.5px] italic text-text-quaternary/80 py-3 px-3 rounded-[var(--radius-md)] border border-dashed border-white/[0.05] text-center">
                    Aucune scène. Cliquez sur <span className="not-italic text-text-tertiary">+ Scène</span> pour en créer.
                  </div>
                ) : (
                  <div className="flex flex-col rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-tertiary/40 overflow-hidden">
                    {scenes
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((scene, idx) => {
                        const badge = SCENE_STATUS_BADGE[scene.status] ?? SCENE_STATUS_BADGE.todo;
                        const isDragging = dragSceneId === scene.id;
                        const isOver = dragOverSceneId === scene.id && dragSceneId !== scene.id;
                        const isEditing = editingId === scene.id;
                        return (
                          <div
                            key={scene.id}
                            draggable={!isEditing}
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
                            className={`group flex items-center gap-2 pl-2 pr-2 py-2 border-b border-white/[0.04] last:border-b-0 transition-colors ${
                              isDragging
                                ? "opacity-40"
                                : isOver
                                  ? "bg-[var(--color-accent-bg)]/50"
                                  : "hover:bg-white/[0.02]"
                            } ${isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing"}`}
                          >
                            {/* Drag grip */}
                            <span
                              className="shrink-0 w-3 text-[10px] text-text-quaternary/40 select-none group-hover:text-text-quaternary transition-colors"
                              title="Glisser pour réordonner"
                            >
                              ⋮⋮
                            </span>
                            {/* Position number, font-serif */}
                            <span className="shrink-0 font-serif italic text-[12px] text-text-quaternary w-6 text-right tabular-nums">
                              {idx + 1}
                            </span>
                            {/* Title */}
                            {isEditing ? (
                              <input
                                ref={inputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => {
                                  if (editValue.trim() && editValue.trim() !== scene.title)
                                    renameScene(scene.id, editValue.trim());
                                  else setEditingId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editValue.trim() && editValue.trim() !== scene.title)
                                      renameScene(scene.id, editValue.trim());
                                    else setEditingId(null);
                                  }
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="flex-1 px-1.5 py-0.5 text-[12px] border border-[var(--color-accent-border)] rounded-[var(--radius-sm)] bg-bg-primary text-text-primary outline-none"
                              />
                            ) : (
                              <span
                                onDoubleClick={() => {
                                  setEditingId(scene.id);
                                  setEditValue(scene.title);
                                }}
                                className="flex-1 min-w-0 text-[12.5px] text-text-primary break-words"
                                title="Double-clic pour renommer"
                              >
                                {scene.title}
                              </span>
                            )}
                            {/* Status pill — même idiome que breadcrumb */}
                            <button
                              onClick={() => cycleSceneStatus(scene.id)}
                              title={`Statut : ${badge.label} (cliquer pour changer)`}
                              className="shrink-0 inline-flex items-center gap-1.5 h-5 pl-1.5 pr-2 rounded-full cursor-pointer transition-colors"
                              style={{
                                background: badge.bg,
                                border: `1px solid ${badge.border}`,
                                color: badge.text,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                              <span className="text-[10.5px] font-medium">{badge.label}</span>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => deleteScene(scene.id)}
                              title="Supprimer" aria-label="Supprimer"
                              className="shrink-0 w-5 h-5 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[11px] text-text-quaternary hover:text-[#e89494] cursor-pointer border-none bg-transparent transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "world" && (
          <>
            {wbSelected ? (
              <WbEntryPanel
                entry={wbSelected}
                loading={wbLoading}
                initialEditing={wbSelected.id === justCreatedId}
                openFullTitle="Ouvrir la fiche complète dans un nouvel onglet"
                onBack={() => {
                  if (wbSelected && wbSelected.id === justCreatedId) {
                    setJustCreatedId(null);
                  }
                  setWbSelected(null);
                }}
                onOpenFull={() => openWbEntryFull(wbSelected.id)}
                onLocalUpdate={(patch) => {
                  setWbSelected((prev) => (prev ? { ...prev, ...patch } : prev));
                  // Répercute les champs "liste" dans extraWbEntries pour que
                  // la carte reflète le nouveau titre/sous-titre au retour.
                  setExtraWbEntries((prev) =>
                    prev.map((e) =>
                      e.id === wbSelected.id
                        ? {
                            ...e,
                            ...(patch.title !== undefined ? { title: patch.title as string } : {}),
                            ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle as string | null } : {}),
                            ...(patch.subcategory !== undefined ? { subcategory: patch.subcategory as string | null } : {}),
                            ...(patch.main_image_url !== undefined ? { main_image_url: patch.main_image_url as string | null } : {}),
                            ...(patch.status !== undefined ? { status: patch.status as string } : {}),
                          }
                        : e
                    )
                  );
                }}
              />
            ) : (
              <WorldTabBody
                wbEntries={wbEntriesForTab}
                wbCategoryOptions={wbCategoryOptions}
                wbScope={wbScope}
                setWbScope={setWbScope}
                wbCategoryFilter={wbCategoryFilter}
                setWbCategoryFilter={setWbCategoryFilter}
                wbQuery={wbQuery}
                setWbQuery={setWbQuery}
                linkedEntryIds={linkedEntryIds}
                onLink={linkWbEntry}
                onUnlink={unlinkWbEntry}
                onOpen={loadWbEntry}
                onOpenAll={() => window.open(`/wb/${projectId}`, "_blank", "noopener,noreferrer")}
                pickerCategory={pickerCategory}
                setPickerCategory={setPickerCategory}
                pickerQuery={pickerQuery}
                setPickerQuery={setPickerQuery}
                hasChapter={!!chapterId}
                creatableCategories={wbCreatableCategories}
                creatingMenu={creatingMenu}
                setCreatingMenu={setCreatingMenu}
                onCreate={(cat) => createWbEntry(cat, defaultSubtypeFor(cat))}
              />
            )}
          </>
        )}

        {activeTab === "versions" && (
          <>
            {!chapterId ? (
              <div className="text-[11px] italic text-text-quaternary py-1.5 px-2 rounded border border-dashed border-white/[0.05]">
                Sélectionnez un chapitre
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {loadingVersions ? (
                  <div className="text-[11px] italic text-text-quaternary">Chargement…</div>
                ) : versions.length === 0 ? (
                  <div className="text-[11px] italic text-text-quaternary/80 py-1.5 px-2 rounded border border-dashed border-white/[0.05]">
                    Aucune version pour l&apos;instant. Un instantané est créé automatiquement à chaque changement de chapitre.
                  </div>
                ) : (
                  <>
                    {/* ====== VERSION COURANTE ====== */}
                    {(() => {
                      const v = versions[0];
                      const prev = versions[1];
                      const delta = prev ? v.word_count - prev.word_count : null;
                      const d = new Date(v.created_at);
                      const versionLabel = v.version ?? String(versions.length);
                      const isRenaming = renamingVersionId === v.id;
                      const description = v.name?.trim();
                      return (
                        <section className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[9.5px] font-medium uppercase text-text-quaternary"
                              style={{ letterSpacing: "0.18em" }}
                            >
                              Version courante
                            </span>
                            <button
                              onClick={triggerManualSnapshot}
                              className="ml-auto text-[10.5px] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer transition-colors inline-flex items-center gap-1"
                              title="Créer un instantané nommé"
                            >
                              <span className="text-[12px] leading-none">+</span>
                              instantané
                            </button>
                          </div>
                          <div
                            className="rounded-md p-2 border"
                            style={{
                              borderColor: "rgba(239,159,39,0.28)",
                              background:
                                "linear-gradient(180deg, rgba(239,159,39,0.06) 0%, rgba(239,159,39,0.02) 100%)",
                            }}
                          >
                            <div className="flex items-baseline gap-1.5 mb-1">
                              <span
                                className="text-[12px] text-text-primary"
                                style={{ fontFamily: "var(--font-serif)" }}
                              >
                                v.&nbsp;{versionLabel}
                              </span>
                              <span className="text-[10.5px] text-text-tertiary">
                                — courante
                              </span>
                              <span className="ml-auto text-[10px] text-text-tertiary tabular-nums">
                                {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}{" "}
                                {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {isRenaming ? (
                              <input
                                autoFocus
                                value={renameVersionDraft}
                                onChange={(e) => setRenameVersionDraft(e.target.value)}
                                onBlur={() => renameVersion(v.id, renameVersionDraft)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    renameVersion(v.id, renameVersionDraft);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setRenamingVersionId(null);
                                  }
                                }}
                                placeholder="Décris ce qui change…"
                                className="w-full text-[11px] bg-bg-primary border border-[var(--color-accent)]/40 rounded px-1.5 py-1 text-text-primary outline-none mb-1.5"
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setRenameVersionDraft(v.name ?? "");
                                  setRenamingVersionId(v.id);
                                }}
                                className="block w-full text-left text-[11px] text-text-secondary italic leading-snug mb-1.5 cursor-text hover:text-text-primary transition-colors bg-transparent border-none p-0"
                                title="Cliquer pour renommer"
                              >
                                {description ? `« ${description} »` : "Ajouter une description…"}
                              </button>
                            )}
                            <div className="flex items-center gap-1.5">
                              {delta !== null && delta > 0 && (
                                <span
                                  className="px-1.5 py-px rounded text-[10px] font-mono tabular-nums"
                                  style={{
                                    background: "rgba(93,202,165,0.14)",
                                    color: "#7ed8b7",
                                  }}
                                >
                                  + {delta.toLocaleString("fr-FR")} mots
                                </span>
                              )}
                              {delta !== null && delta < 0 && (
                                <span
                                  className="px-1.5 py-px rounded text-[10px] font-mono tabular-nums"
                                  style={{
                                    background: "rgba(224,85,85,0.14)",
                                    color: "#e89494",
                                  }}
                                >
                                  − {Math.abs(delta).toLocaleString("fr-FR")}
                                </span>
                              )}
                              {v.label && (
                                <span className="text-[10px] text-text-tertiary italic">
                                  {v.label}
                                </span>
                              )}
                              <span className="ml-auto text-[10px] text-text-tertiary tabular-nums">
                                {v.word_count.toLocaleString("fr-FR")} mots
                              </span>
                            </div>
                          </div>
                        </section>
                      );
                    })()}

                    {/* ====== HISTORIQUE ====== */}
                    {versions.length > 1 && (
                      <section className="flex flex-col gap-1.5">
                        <span
                          className="text-[9.5px] font-medium uppercase text-text-quaternary"
                          style={{ letterSpacing: "0.18em" }}
                        >
                          Historique
                        </span>
                        <div className="flex flex-col gap-1">
                          {versions.slice(1).map((v, i) => {
                            const absoluteIdx = i + 1;
                            const isPreview = previewVersionId === v.id;
                            const isRenaming = renamingVersionId === v.id;
                            const d = new Date(v.created_at);
                            const prev = versions[absoluteIdx + 1];
                            const delta = prev ? v.word_count - prev.word_count : null;
                            const isInitial = !prev; // première version
                            const versionLabel = v.version ?? String(versions.length - absoluteIdx);
                            const description = v.name?.trim();
                            const isLabelOnly = !description && !!v.label;
                            return (
                              <div
                                key={v.id}
                                className={`rounded-md border transition-colors ${
                                  isPreview
                                    ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/[0.04]"
                                    : "border-border hover:border-white/[0.12]"
                                }`}
                              >
                                <div className="flex items-start gap-2 p-2">
                                  {/* Dot cercle vide */}
                                  <span
                                    className="shrink-0 mt-[4px] w-2.5 h-2.5 rounded-full"
                                    style={{
                                      border: "1.5px solid rgba(255,255,255,0.22)",
                                      background: "transparent",
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      if (isRenaming) return;
                                      setPreviewVersionId(isPreview ? null : v.id);
                                    }}
                                    className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0"
                                  >
                                    {/* Ligne 1 : v.N + date */}
                                    <div className="flex items-baseline gap-1.5 mb-0.5">
                                      <span
                                        className={`text-[11.5px] ${
                                          isLabelOnly ? "text-text-tertiary" : "text-text-primary"
                                        }`}
                                        style={{ fontFamily: "var(--font-serif)" }}
                                      >
                                        v.&nbsp;{versionLabel}
                                      </span>
                                      <span className="ml-auto text-[10px] text-text-tertiary tabular-nums">
                                        {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}{" "}
                                        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    {/* Description */}
                                    {isRenaming ? (
                                      <input
                                        autoFocus
                                        value={renameVersionDraft}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setRenameVersionDraft(e.target.value)}
                                        onBlur={() => renameVersion(v.id, renameVersionDraft)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            renameVersion(v.id, renameVersionDraft);
                                          } else if (e.key === "Escape") {
                                            e.preventDefault();
                                            setRenamingVersionId(null);
                                          }
                                        }}
                                        placeholder="Décris ce qui change…"
                                        className="w-full text-[11px] bg-bg-primary border border-[var(--color-accent)]/40 rounded px-1 py-0.5 text-text-primary outline-none mb-1"
                                      />
                                    ) : description ? (
                                      <div className="text-[10.5px] italic text-text-secondary leading-snug mb-1">
                                        {description}
                                      </div>
                                    ) : isLabelOnly ? (
                                      <div className="text-[10.5px] italic text-text-quaternary/80 leading-snug mb-1">
                                        {v.label}
                                      </div>
                                    ) : null}
                                    {/* Delta + meta */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {delta !== null && delta > 0 && (
                                        <span
                                          className="px-1.5 py-px rounded text-[10px] font-mono tabular-nums"
                                          style={{
                                            background: "rgba(93,202,165,0.14)",
                                            color: "#7ed8b7",
                                          }}
                                        >
                                          + {delta.toLocaleString("fr-FR")} mots
                                        </span>
                                      )}
                                      {delta !== null && delta < 0 && (
                                        <span
                                          className="px-1.5 py-px rounded text-[10px] font-mono tabular-nums"
                                          style={{
                                            background: "rgba(224,85,85,0.14)",
                                            color: "#e89494",
                                          }}
                                        >
                                          − {Math.abs(delta).toLocaleString("fr-FR")} mots
                                        </span>
                                      )}
                                      {isInitial && (
                                        <span
                                          className="px-1.5 py-px rounded text-[10px] font-mono tabular-nums"
                                          style={{
                                            background: "rgba(93,202,165,0.14)",
                                            color: "#7ed8b7",
                                          }}
                                        >
                                          + {v.word_count.toLocaleString("fr-FR")} mots · initial
                                        </span>
                                      )}
                                      {v.label && description && (
                                        <span className="text-[10px] text-text-tertiary italic">
                                          · {v.label}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                </div>
                                {isPreview && !isRenaming && (
                                  <div className="border-t border-border/70 p-1.5">
                                    <div
                                      className="text-[10px] text-text-secondary max-h-28 overflow-y-auto bg-bg-primary rounded p-1.5 border border-border leading-snug"
                                      dangerouslySetInnerHTML={{
                                        __html:
                                          v.content.length > 800
                                            ? v.content.slice(0, 800) + "…"
                                            : v.content,
                                      }}
                                    />
                                    <div className="flex gap-1 mt-1.5">
                                      <button
                                        onClick={async () => {
                                          if (
                                            await appConfirm(
                                              "Restaurer cette version ? Le contenu actuel sera automatiquement sauvegardé avant.",
                                              { confirmLabel: "Restaurer", danger: false },
                                            )
                                          ) {
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
                                          setRenameVersionDraft(v.name ?? "");
                                          setRenamingVersionId(v.id);
                                        }}
                                        className="text-[10px] text-text-tertiary hover:text-text-primary cursor-pointer border border-border rounded px-1.5 py-0.5 bg-transparent transition-colors"
                                        title="Renommer" aria-label="Renommer"
                                      >
                                        ✎
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (await appConfirm("Supprimer cette version ?", { confirmLabel: "Supprimer" })) deleteVersion(v.id);
                                        }}
                                        className="text-[10px] text-text-tertiary hover:text-red cursor-pointer border border-border rounded px-1.5 py-0.5 bg-transparent transition-colors"
                                        title="Supprimer" aria-label="Supprimer"
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
                      </section>
                    )}

                    {/* ====== Bouton Comparer ====== */}
                    {versions.length >= 2 && (() => {
                      const cur = versions[0];
                      const prev = versions[1];
                      const curLabel = cur.version ?? String(versions.length);
                      const prevLabel = prev.version ?? String(versions.length - 1);
                      return (
                        <button
                          onClick={() => setPreviewVersionId(previewVersionId === prev.id ? null : prev.id)}
                          className="w-full text-[11px] text-text-secondary border border-border rounded-md px-2 py-1.5 bg-transparent cursor-pointer hover:border-[var(--color-accent)]/40 hover:text-text-primary transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <span className="text-[12px]">⇅</span>
                          <span>
                            Comparer v.&nbsp;{curLabel} ↔ v.&nbsp;{prevLabel}
                          </span>
                        </button>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers Info tab ---------- */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-medium text-text-quaternary uppercase mb-2"
      style={{ letterSpacing: "0.18em" }}
    >
      {children}
    </div>
  );
}

function FieldBlock({
  label,
  children,
  padY = "normal",
}: {
  label: string;
  children: React.ReactNode;
  padY?: "tight" | "normal";
}) {
  const pad = padY === "tight" ? "py-1.5" : "py-2";
  return (
    <div className={`px-3 ${pad} border-b border-white/[0.04] last:border-b-0`}>
      <div
        className="text-[9.5px] font-medium text-text-quaternary uppercase mb-1"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div className="text-[12px] text-text-secondary">{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-bg-tertiary/40 border-b border-white/[0.04] last:border-b-0">
      <span className="text-[11.5px] text-text-tertiary">{label}</span>
      <div className="flex items-center min-w-0">{children}</div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-3 rounded-[var(--radius-md)] border border-white/[0.06] bg-bg-tertiary/40">
      <div
        className="text-[9.5px] font-medium text-text-quaternary uppercase mb-1.5"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div className="font-serif text-[22px] leading-none text-text-primary tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[10.5px] text-text-quaternary">{hint}</div>}
    </div>
  );
}

/* ---------- Preview inline d'une fiche WB dans le panneau ---------- */
/**
 * Affichage d'une fiche World Building dans le ContextPanel de l'éditeur.
 * Par défaut : mode consultation (lecture soignée, serif italique, eyebrow
 * labels) — c'est l'usage principal pendant l'écriture.
 * Un bouton « ✎ Modifier » bascule en mode édition avec sauvegarde
 * automatique (debounce 800 ms).
 */

/* ---- World tab body : fiches liées au chapitre + bibliothèque ---- */
function WorldTabBody({
  wbEntries,
  wbCategoryOptions,
  wbScope,
  setWbScope,
  wbCategoryFilter,
  setWbCategoryFilter,
  wbQuery,
  setWbQuery,
  linkedEntryIds,
  onLink,
  onUnlink,
  onOpen,
  onOpenAll,
  pickerCategory,
  setPickerCategory,
  pickerQuery,
  setPickerQuery,
  hasChapter,
  creatableCategories,
  creatingMenu,
  setCreatingMenu,
  onCreate,
}: {
  wbEntries: WbEntryLite[];
  wbCategoryOptions: { key: string; label: string; icon: string }[];
  wbScope: "linked" | "all";
  setWbScope: (v: "linked" | "all") => void;
  wbCategoryFilter: string;
  setWbCategoryFilter: (v: string) => void;
  wbQuery: string;
  setWbQuery: (v: string) => void;
  linkedEntryIds: Set<string>;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenAll: () => void;
  pickerCategory: string | null;
  setPickerCategory: (v: string | null) => void;
  pickerQuery: string;
  setPickerQuery: (v: string) => void;
  hasChapter: boolean;
  creatableCategories: { key: string; label: string; icon: string; group: string }[];
  creatingMenu: boolean;
  setCreatingMenu: (v: boolean) => void;
  onCreate: (category: string) => void;
}) {
  // Repli par catégorie (déplié par défaut).
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  // Fiches liées au chapitre courant
  const linkedEntries = wbEntries.filter((e) => linkedEntryIds.has(e.id));

  // Grouper par catégorie (et ordonner selon WB_CATEGORIES)
  const linkedByCategory = new Map<string, WbEntryLite[]>();
  for (const e of linkedEntries) {
    const list = linkedByCategory.get(e.category) ?? [];
    list.push(e);
    linkedByCategory.set(e.category, list);
  }

  // Catégories "candidates" = toutes les catégories WB visibles pour ce projet
  // (wbCategoryOptions = celles qui ont au moins une fiche dans la bibliothèque)
  const orderedCategoryKeys = wbCategoryOptions.map((c) => c.key);
  // Ajoute aussi les catégories liées qui ne sont plus dans wbCategoryOptions (edge case)
  for (const k of linkedByCategory.keys()) {
    if (!orderedCategoryKeys.includes(k)) orderedCategoryKeys.push(k);
  }

  return (
    <>
      {/* Barre de filtres */}
      <div className="world-filterbar">
        <div className="world-pills">
          <button
            className={`world-pill${wbScope === "linked" ? " active" : ""}`}
            onClick={() => setWbScope("linked")}
          >
            <span className="pill-dot accent" /> Liées
            <span className="pill-count">{linkedEntries.length}</span>
          </button>
          <button
            className={`world-pill${wbScope === "all" ? " active" : ""}`}
            onClick={() => setWbScope("all")}
          >
            Toutes <span className="pill-count">{wbEntries.length}</span>
          </button>
          <div className="relative" style={{ marginLeft: "auto" }}>
            <button
              className="world-pill"
              onClick={() => setCreatingMenu(!creatingMenu)}
              title="Créer une nouvelle fiche"
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Fiche
            </button>
            {creatingMenu && (
              <>
                <button
                  type="button"
                  aria-label="Fermer le menu"
                  onClick={() => setCreatingMenu(false)}
                  className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] max-h-[60vh] overflow-y-auto rounded-[var(--radius-md)] border border-white/[0.08] bg-bg-secondary shadow-xl py-1">
                  {(() => {
                    const groups = new Map<string, typeof creatableCategories>();
                    for (const c of creatableCategories) {
                      const list = groups.get(c.group) ?? [];
                      list.push(c);
                      groups.set(c.group, list);
                    }
                    return Array.from(groups.entries()).map(([group, cats]) => (
                      <div key={group} className="py-1">
                        <div
                          className="px-3 pb-1 text-[9.5px] font-medium uppercase text-text-quaternary"
                          style={{ letterSpacing: "0.18em" }}
                        >
                          {group}
                        </div>
                        {cats.map((c) => (
                          <button
                            key={c.key}
                            onClick={() => onCreate(c.key)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-white/[0.04] hover:text-[var(--color-accent)] cursor-pointer bg-transparent border-none text-left transition-colors"
                          >
                            <span>{c.icon}</span>
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
          <button
            className="world-pill"
            onClick={onOpenAll}
            title="Ouvrir la bibliothèque complète"
          >
            Bibliothèque ↗
          </button>
        </div>

        {wbScope === "all" && (
          <div className="world-search">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="6.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              value={wbQuery}
              onChange={(e) => setWbQuery(e.target.value)}
              placeholder="Rechercher dans les fiches…"
            />
            {wbCategoryOptions.length > 1 && (
              <select
                value={wbCategoryFilter}
                onChange={(e) => setWbCategoryFilter(e.target.value)}
              >
                <option value="all">Toutes catég.</option>
                {wbCategoryOptions.map((c) => {
                  const n = wbEntries.filter((e) => e.category === c.key).length;
                  return (
                    <option key={c.key} value={c.key}>
                      {c.label} ({n})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ---- Vue groupée par catégorie (partagée "Liées" / "Toutes") ---- */}
      {(() => {
        if (wbScope === "linked" && !hasChapter) {
          return (
            <div className="text-[11px] italic text-text-quaternary">
              Sélectionnez un chapitre pour y attacher des fiches.
            </div>
          );
        }

        // Construit les catégories à afficher en fonction du scope.
        const catKeysForAll = wbCategoryOptions.map((c) => c.key);
        const catKeysBase = wbScope === "linked" ? orderedCategoryKeys : catKeysForAll;
        const catKeys = wbScope === "all" && wbCategoryFilter !== "all"
          ? catKeysBase.filter((k) => k === wbCategoryFilter)
          : catKeysBase;

        // Requête de recherche (seulement en "Toutes", conservée globalement pour
        // cohérence UI).
        const q = wbScope === "all" ? wbQuery.trim().toLowerCase() : "";

        if (catKeys.length === 0) {
          return (
            <div className="text-[11px] italic text-text-quaternary">
              Aucune fiche dans le World Building de ce projet. Ouvrez le World Building depuis la barre latérale pour bâtir votre univers.
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-4">
            {catKeys.map((catKey) => {
              const cat = getCategoryDef(catKey);
              const allOfCat = wbEntries.filter((e) => e.category === catKey);
              const matchesQuery = (e: WbEntryLite) => {
                if (!q) return true;
                return (
                  (e.title ?? "").toLowerCase().includes(q) ||
                  (e.subtitle ?? "").toLowerCase().includes(q)
                );
              };
              const entries =
                wbScope === "linked"
                  ? (linkedByCategory.get(catKey) ?? [])
                  : allOfCat.filter(matchesQuery);

              const label = cat?.label ?? catKey;
              const icon = cat?.icon ?? "📁";

              // En "Toutes", on cache les catégories vides dues au filtre de recherche
              if (wbScope === "all" && q && entries.length === 0) return null;

              const isPerso = catKey === "personnages";
              const collapsed = !!collapsedCats[catKey];
              return (
                <section key={catKey} className="world-section">
                  <button
                    className="world-section-head"
                    onClick={() =>
                      setCollapsedCats((s) => ({ ...s, [catKey]: !s[catKey] }))
                    }
                  >
                    <span className="world-section-icon">{icon}</span>
                    <span className="world-section-title">{label}</span>
                    <span className="world-section-count">{entries.length}</span>
                    {wbScope === "linked" && hasChapter && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="world-section-add"
                        title={`Lier une fiche ${label}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setPickerCategory(catKey);
                          setPickerQuery("");
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.stopPropagation();
                            setPickerCategory(catKey);
                            setPickerQuery("");
                          }
                        }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1 }}>+</span> ajouter
                      </span>
                    )}
                    <span className={`world-section-chev${collapsed ? " collapsed" : ""}`}>
                      ▾
                    </span>
                  </button>

                  {!collapsed &&
                    (entries.length === 0 ? (
                      <div className="world-empty">
                        {wbScope === "linked"
                          ? "Aucune fiche liée. Les liens se posent depuis la fiche elle-même."
                          : "Aucune fiche dans cette catégorie."}
                      </div>
                    ) : (
                      <div className={`world-card-grid${isPerso ? " portraits" : ""}`}>
                        {entries.map((e) => {
                          const isLinked = linkedEntryIds.has(e.id);
                          return (
                            <WbCard
                              key={e.id}
                              entry={e}
                              linked={isLinked}
                              portrait={isPerso}
                              onOpen={() => onOpen(e.id)}
                              onToggleLink={
                                wbScope === "linked"
                                  ? () => onUnlink(e.id)
                                  : hasChapter
                                    ? () => (isLinked ? onUnlink(e.id) : onLink(e.id))
                                    : undefined
                              }
                            />
                          );
                        })}
                      </div>
                    ))}
                </section>
              );
            })}
          </div>
        );
      })()}

      {/* ---- Picker overlay ---- */}
      {pickerCategory !== null && (
        <PickerOverlay
          categoryKey={pickerCategory}
          query={pickerQuery}
          setQuery={setPickerQuery}
          wbEntries={wbEntries}
          linkedEntryIds={linkedEntryIds}
          onClose={() => setPickerCategory(null)}
          onPick={(id) => {
            onLink(id);
          }}
        />
      )}
    </>
  );
}

/* ---- WbCard : carte fiche de l'onglet Univers (redesign world-card) ---- */
function WbCard({
  entry,
  linked,
  portrait,
  onOpen,
  onToggleLink,
}: {
  entry: WbEntryLite;
  linked: boolean;
  portrait?: boolean;
  onOpen: () => void;
  onToggleLink?: () => void;
}) {
  const cat = getCategoryDef(entry.category);
  const sub =
    entry.category === "univers_monde" && entry.subcategory
      ? UNIVERS_SUBTYPES.find((st) => st.key === entry.subcategory)
      : null;
  const hasTitle = (entry.title ?? "").trim().length > 0;
  const title = hasTitle ? (entry.title as string) : "Sans titre";
  const catLabel = sub?.label ?? cat?.label ?? entry.category;
  const catIcon = sub?.icon ?? cat?.icon ?? "✦";
  // Glyphe central : initiale du titre pour un personnage, icône de
  // catégorie sinon.
  const glyph = portrait
    ? hasTitle
      ? title.trim()[0].toUpperCase()
      : "?"
    : catIcon;
  const role = (entry.subtitle ?? "").trim() || catLabel;

  return (
    <div
      role="button"
      tabIndex={0}
      title={title}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`world-card${linked ? " linked" : ""}`}
    >
      <div className="world-card-art">
        {entry.main_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={entry.main_image_url} alt="" />
        ) : (
          <span className="world-card-glyph">{glyph}</span>
        )}
        <span className="world-card-cat">
          <span aria-hidden>{catIcon}</span>
          <span>{catLabel}</span>
        </span>
        {onToggleLink && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLink();
            }}
            title={linked ? "Retirer du chapitre" : "Ajouter au chapitre"}
            className={`world-card-toggle${linked ? " on" : ""}`}
          >
            {linked ? "✓" : "+"}
          </button>
        )}
      </div>
      <div className="world-card-body">
        <div className={`world-card-name${hasTitle ? "" : " untitled"}`}>{title}</div>
        <div className="world-card-role">{role}</div>
      </div>
    </div>
  );
}

/* ---- PickerOverlay : choisir une fiche à lier au chapitre ---- */
function PickerOverlay({
  categoryKey,
  query,
  setQuery,
  wbEntries,
  linkedEntryIds,
  onClose,
  onPick,
}: {
  categoryKey: string;
  query: string;
  setQuery: (v: string) => void;
  wbEntries: WbEntryLite[];
  linkedEntryIds: Set<string>;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const cat = getCategoryDef(categoryKey);
  const q = query.trim().toLowerCase();
  const pool = wbEntries
    .filter((e) => e.category === categoryKey)
    .filter((e) => !linkedEntryIds.has(e.id))
    .filter((e) => {
      if (!q) return true;
      return (
        (e.title ?? "").toLowerCase().includes(q) ||
        (e.subtitle ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-bg-secondary border border-white/[0.08] shadow-2xl flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] shrink-0">
          <span className="text-[13px]">{cat?.icon ?? "📁"}</span>
          <span className="text-[13px] font-medium text-text-primary">
            Lier une fiche · {cat?.label ?? categoryKey}
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-text-tertiary hover:text-text-primary cursor-pointer text-[14px]"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-2 shrink-0">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fiche…"
            className="w-full text-[12px] px-2.5 py-1.5 bg-bg-primary border border-border rounded focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {pool.length === 0 ? (
            <div className="text-[11px] italic text-text-quaternary px-2 py-3">
              {q
                ? "Aucune fiche ne correspond."
                : "Toutes les fiches de cette catégorie sont déjà liées."}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {pool.map((e) => {
                const hasTitle = (e.title ?? "").trim().length > 0;
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      onPick(e.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-white/[0.04] cursor-pointer text-left transition-colors"
                  >
                    {e.main_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={e.main_image_url}
                        alt=""
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center text-[13px] shrink-0">
                        {cat?.icon ?? "📄"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] truncate ${hasTitle ? "text-text-primary" : "italic text-text-quaternary"}`}>
                        {hasTitle ? e.title : "Sans titre"}
                      </div>
                      {e.subtitle && (
                        <div className="text-[10.5px] text-text-tertiary truncate">{e.subtitle}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
