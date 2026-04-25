"use client";

import { useState, useRef, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChapterStatus } from "@/types/database";
import type { ChapterData as ChapterRow, CustomColumn, CellValue } from "@/app/(app)/planning/[novelId]/planning-client";
import { RichEditableCell } from "./RichEditableCell";
import { ThemePills } from "./ThemePills";

/* ---- Column definitions ---- */
interface ColumnDef {
  key: string;
  label: string;
  width: string;
  type: "title" | "text" | "status" | "words" | "custom";
  field?: string; // chapter field name
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "chapitre", label: "Chapitre", width: "160px", type: "title", field: "title" },
  { key: "theme", label: "Thème", width: "180px", type: "text", field: "themes" },
  { key: "resume", label: "Résumé du Chapitre", width: "200px", type: "text", field: "synopsis" },
  { key: "plot_elements", label: "Éléments intrigue globale", width: "200px", type: "text", field: "plot_elements" },
  { key: "minor_elements", label: "Éléments mineurs/ambiances", width: "200px", type: "text", field: "minor_elements" },
  { key: "observations", label: "Observations / remarques", width: "180px", type: "text", field: "observations" },
  { key: "tension", label: "Indices/tension relative", width: "180px", type: "text", field: "tension_indices" },
  { key: "pivot", label: "Bascule", width: "150px", type: "text", field: "pivot" },
  { key: "noeud", label: "Nœud narratif", width: "150px", type: "text", field: "narrative_knot" },
];

const DEFAULT_WIDTHS: Record<string, number> = {};
DEFAULT_COLUMNS.forEach((c) => {
  DEFAULT_WIDTHS[c.key] = parseInt(c.width);
});

const DEFAULT_COLUMN_ORDER = DEFAULT_COLUMNS.map((c) => c.key);

/* ---- Status ---- */
const STATUS_LABELS: Record<ChapterStatus, { label: string; color: string }> = {
  a_ecrire: { label: "À écrire", color: "bg-bg-hover text-text-tertiary" },
  premier_jet: { label: "Premier jet", color: "bg-[#888780]/15 text-[#888780]" },
  revision: { label: "Révision", color: "bg-amber/15 text-amber" },
  reecriture: { label: "Réécriture", color: "bg-primary/15 text-primary" },
  correction: { label: "Correction", color: "bg-teal/15 text-teal" },
  termine: { label: "Terminé", color: "bg-[#1D9E75]/15 text-[#1D9E75]" },
};

const STATUS_ORDER: ChapterStatus[] = [
  "a_ecrire", "premier_jet", "revision", "reecriture", "correction", "termine",
];

function dotClassFor(status: ChapterStatus): string {
  switch (status) {
    case "termine":
      return "bg-[#1D9E75]";
    case "correction":
      return "bg-teal";
    case "reecriture":
      return "bg-[var(--color-accent)]";
    case "revision":
      return "bg-amber";
    case "premier_jet":
      return "bg-white/40";
    case "a_ecrire":
    default:
      return "bg-white/20";
  }
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  icon,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-[12px] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-[var(--color-accent-bg)] border border-[var(--color-accent-border)] text-[var(--color-accent)]"
          : "bg-bg-secondary border border-white/[0.06] text-text-secondary hover:text-text-primary hover:border-white/[0.12]"
      }`}
    >
      {typeof icon === "string" ? (
        <span className="text-[13px] leading-none">{icon}</span>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ---- Types (imported from planning-client) ---- */

/* ---- Editable Cell (rich text — Bold/Italic/Underline/Strike + color + highlight) ---- */
function EditableCell(props: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return <RichEditableCell {...props} />;
}

/* ---- Main Table ---- */
/* ---- Palette de couleurs ----
 * On utilise des rgba semi-transparents pour rester lisibles sur le fond
 * navy de l'app sans casser la couleur du texte des cellules.
 */
const COLOR_PALETTE: { hex: string; label: string }[] = [
  { hex: "rgba(248, 113, 113, 0.22)", label: "Rouge" },
  { hex: "rgba(251, 146, 60, 0.22)",  label: "Orange" },
  { hex: "rgba(228, 180, 140, 0.22)", label: "Pêche" },
  { hex: "rgba(250, 204, 21, 0.22)",  label: "Jaune" },
  { hex: "rgba(93, 202, 165, 0.22)",  label: "Menthe" },
  { hex: "rgba(96, 165, 250, 0.22)",  label: "Bleu" },
  { hex: "rgba(192, 132, 252, 0.22)", label: "Lavande" },
  { hex: "rgba(255, 255, 255, 0.07)", label: "Gris" },
];

export function ChapterTable({
  novelId,
  chapters,
  setChapters,
  customColumns,
  setCustomColumns,
  cellValues,
  setCellValues,
  initialColumnOrder,
  initialColumnColors,
}: {
  novelId: string;
  chapters: ChapterRow[];
  setChapters: Dispatch<SetStateAction<ChapterRow[]>>;
  customColumns: CustomColumn[];
  setCustomColumns: Dispatch<SetStateAction<CustomColumn[]>>;
  cellValues: CellValue[];
  setCellValues: Dispatch<SetStateAction<CellValue[]>>;
  initialColumnOrder?: string[] | null;
  initialColumnColors?: Record<string, string>;
}) {
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Couleurs des colonnes (persistées sur le roman)
  const [columnColors, setColumnColors] = useState<Record<string, string>>(
    initialColumnColors ?? {},
  );

  // État de la palette ouverte (anchor + cible)
  const [palette, setPalette] = useState<
    | null
    | { kind: "row";    chapterId: string; anchor: { top: number; left: number } }
    | { kind: "col";    colKey: string;    anchor: { top: number; left: number } }
    | { kind: "cell";   chapterId: string; colKey: string; anchor: { top: number; left: number } }
  >(null);

  // Column order: default columns + custom columns
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (initialColumnOrder && initialColumnOrder.length > 0) return initialColumnOrder;
    return [
      ...DEFAULT_COLUMN_ORDER,
      ...customColumns.map((c) => `custom:${c.id}`),
    ];
  });

  // Row drag state
  const [dragRowIdx, setDragRowIdx] = useState<number | null>(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState<number | null>(null);

  // Column drag state
  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  // Column widths (pixels)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = { ...DEFAULT_WIDTHS };
    customColumns.forEach((c) => {
      widths[`custom:${c.id}`] = 160;
    });
    return widths;
  });

  // Hidden columns
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Scroll overflow detection
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = tableWrapperRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tableWrapperRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll, columnWidths, hiddenColumns]);

  function toggleColumn(key: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const supabaseRef = useRef(createClient());
  const sorted = [...chapters].sort((a, b) => a.position - b.position);

  // Build ordered columns list (all, for menu)
  const allColumnDefs: (ColumnDef & { customId?: string })[] = columnOrder
    .map((key) => {
      if (key.startsWith("custom:")) {
        const customId = key.replace("custom:", "");
        const col = customColumns.find((c) => c.id === customId);
        if (!col) return null;
        return { key, label: col.name, width: "160px", type: "custom" as const, customId: col.id };
      }
      return DEFAULT_COLUMNS.find((c) => c.key === key) ?? null;
    })
    .filter(Boolean) as (ColumnDef & { customId?: string })[];

  // Visible columns (filtered)
  const visibleColumns = allColumnDefs.filter((c) => !hiddenColumns.has(c.key));

  // Grid template from pixel widths
  const gridTemplate = visibleColumns
    .map((c) => `${columnWidths[c.key] ?? 160}px`)
    .join(" ");

  /* ---- Column resize ---- */
  function handleColumnResize(colKey: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] ?? 160;

    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + ev.clientX - startX);
      setColumnWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /* ---- Save column order ---- */
  async function saveColumnOrder(newOrder: string[]) {
    setColumnOrder(newOrder);
    await supabaseRef.current
      .from("novels")
      .update({ column_order: newOrder })
      .eq("id", novelId);
  }

  /* ---- Chapter field save ---- */
  const saveChapterField = useCallback(
    async (chapterId: string, field: string, value: string | string[] | null) => {
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c))
      );
      await supabaseRef.current
        .from("chapters")
        .update({ [field]: value })
        .eq("id", chapterId);
    },
    [setChapters]
  );

  /* ---- Color save : ligne ---- */
  async function saveRowColor(chapterId: string, color: string | null) {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, row_color: color } : c)),
    );
    await supabaseRef.current
      .from("chapters")
      .update({ row_color: color })
      .eq("id", chapterId);
  }

  /* ---- Color save : colonne (toutes lignes) ---- */
  async function saveColumnColor(colKey: string, color: string | null) {
    const next = { ...columnColors };
    if (color) next[colKey] = color;
    else delete next[colKey];
    setColumnColors(next);
    await supabaseRef.current
      .from("novels")
      .update({ column_colors: next })
      .eq("id", novelId);
  }

  /* ---- Color save : cellule (colonne par défaut) ---- */
  async function saveDefaultCellColor(
    chapterId: string,
    colKey: string,
    color: string | null,
  ) {
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id !== chapterId) return c;
        const cur = c.cell_colors ?? {};
        const next = { ...cur };
        if (color) next[colKey] = color;
        else delete next[colKey];
        return { ...c, cell_colors: next };
      }),
    );
    const chapter = chapters.find((c) => c.id === chapterId);
    const cur = chapter?.cell_colors ?? {};
    const next = { ...cur };
    if (color) next[colKey] = color;
    else delete next[colKey];
    await supabaseRef.current
      .from("chapters")
      .update({ cell_colors: next })
      .eq("id", chapterId);
  }

  /* ---- Color save : cellule (colonne custom) ---- */
  async function saveCustomCellColor(
    columnId: string,
    chapterId: string,
    color: string | null,
  ) {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCellValues((prev) => {
      const existing = prev.find(
        (cv) => cv.column_id === columnId && cv.chapter_id === chapterId,
      );
      if (existing) {
        return prev.map((cv) =>
          cv.id === existing.id ? { ...cv, color } : cv,
        );
      }
      return [...prev, { id: "temp", column_id: columnId, chapter_id: chapterId, value: null, color }];
    });
    await supabase.from("planning_cell_values").upsert(
      { column_id: columnId, chapter_id: chapterId, user_id: user.id, color },
      { onConflict: "column_id,chapter_id" },
    );
  }

  /* ---- Helpers cellule ---- */
  function getCellColor(
    chapter: ChapterRow,
    col: ColumnDef & { customId?: string },
  ): string | undefined {
    if (col.type === "custom" && col.customId) {
      const cv = cellValues.find(
        (v) => v.column_id === col.customId && v.chapter_id === chapter.id,
      );
      return cv?.color ?? undefined;
    }
    return chapter.cell_colors?.[col.key];
  }

  function applyPaletteColor(color: string | null) {
    if (!palette) return;
    if (palette.kind === "row") {
      saveRowColor(palette.chapterId, color);
    } else if (palette.kind === "col") {
      saveColumnColor(palette.colKey, color);
    } else if (palette.kind === "cell") {
      // Distinguer custom vs default
      const def = allColumnDefs.find((c) => c.key === palette.colKey);
      if (def?.type === "custom" && def.customId) {
        saveCustomCellColor(def.customId, palette.chapterId, color);
      } else {
        saveDefaultCellColor(palette.chapterId, palette.colKey, color);
      }
    }
    setPalette(null);
  }

  /* ---- Status cycle ---- */
  function cycleStatus(chapterId: string, current: ChapterStatus) {
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    saveChapterField(chapterId, "status", next);
  }

  /* ---- Add chapter ---- */
  const handleAddChapter = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxPos = chapters.reduce((m, c) => Math.max(m, c.position), -1);

    const { data } = await supabase
      .from("chapters")
      .insert({
        novel_id: novelId,
        user_id: user.id,
        title: "À nommer",
        position: maxPos + 1,
      })
      .select("id, title, position, status, synopsis, word_count, themes, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot")
      .single();

    if (data) {
      setChapters((prev) => [...prev, data as ChapterRow]);
    }
  }, [chapters, novelId, setChapters]);

  // Le bouton "+ Nouveau chapitre" du hero (planning-client) déclenche cet event.
  useEffect(() => {
    const handler = () => handleAddChapter();
    window.addEventListener("autris:add-chapter", handler);
    return () => window.removeEventListener("autris:add-chapter", handler);
  }, [handleAddChapter]);

  /* ---- Custom column cell save ---- */
  async function saveCellValue(columnId: string, chapterId: string, value: string) {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCellValues((prev) => {
      const existing = prev.find(
        (cv) => cv.column_id === columnId && cv.chapter_id === chapterId
      );
      if (existing) {
        return prev.map((cv) => (cv.id === existing.id ? { ...cv, value } : cv));
      }
      return [...prev, { id: "temp", column_id: columnId, chapter_id: chapterId, value }];
    });

    await supabase.from("planning_cell_values").upsert(
      { column_id: columnId, chapter_id: chapterId, user_id: user.id, value },
      { onConflict: "column_id,chapter_id" }
    );
  }

  /* ---- Add custom column ---- */
  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxPos = customColumns.reduce((m, c) => Math.max(m, c.position), -1);

    const { data } = await supabase
      .from("planning_columns")
      .insert({
        novel_id: novelId,
        user_id: user.id,
        name: newColumnName.trim(),
        position: maxPos + 1,
      })
      .select()
      .single();

    if (data) {
      setCustomColumns((prev) => [...prev, data]);
      const newOrder = [...columnOrder, `custom:${data.id}`];
      saveColumnOrder(newOrder);
    }
    setNewColumnName("");
    setShowAddColumn(false);
  }

  /* ---- Delete custom column ---- */
  async function deleteCustomColumn(columnId: string, columnName: string) {
    const ok = window.confirm(
      `Supprimer la colonne « ${columnName} » ?\n\nToutes les valeurs saisies pour cette colonne seront définitivement perdues.`
    );
    if (!ok) return;

    const key = `custom:${columnId}`;
    // Optimiste : on retire tout localement
    setCustomColumns((prev) => prev.filter((c) => c.id !== columnId));
    setCellValues((prev) => prev.filter((v) => v.column_id !== columnId));
    const newOrder = columnOrder.filter((k) => k !== key);
    setColumnOrder(newOrder);
    setColumnWidths((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setHiddenColumns((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    const supabase = supabaseRef.current;
    // Les `planning_cell_values` sont supprimées en cascade (FK) côté DB.
    await Promise.all([
      supabase.from("planning_columns").delete().eq("id", columnId),
      supabase.from("novels").update({ column_order: newOrder }).eq("id", novelId),
    ]);
  }

  /* ---- Row drag & drop ---- */
  async function handleRowDrop() {
    if (dragRowIdx === null || dragOverRowIdx === null || dragRowIdx === dragOverRowIdx) {
      setDragRowIdx(null);
      setDragOverRowIdx(null);
      return;
    }

    const reordered = [...sorted];
    const [item] = reordered.splice(dragRowIdx, 1);
    reordered.splice(dragOverRowIdx, 0, item);
    const updated = reordered.map((c, i) => ({ ...c, position: i }));
    setChapters(updated);
    setDragRowIdx(null);
    setDragOverRowIdx(null);

    const supabase = supabaseRef.current;
    await Promise.all(
      updated.map((c) =>
        supabase.from("chapters").update({ position: c.position }).eq("id", c.id)
      )
    );
  }

  /* ---- Column drag & drop ---- */
  function handleColDrop() {
    if (!dragColKey || !dragOverColKey || dragColKey === dragOverColKey) {
      setDragColKey(null);
      setDragOverColKey(null);
      return;
    }

    const newOrder = [...columnOrder];
    const fromIdx = newOrder.indexOf(dragColKey);
    const toIdx = newOrder.indexOf(dragOverColKey);
    if (fromIdx < 0 || toIdx < 0) return;

    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragColKey);

    setDragColKey(null);
    setDragOverColKey(null);
    saveColumnOrder(newOrder);
  }

  /* ---- Render cell by type ---- */
  function renderCell(col: ColumnDef & { customId?: string }, chapter: ChapterRow) {
    // Colonne "Thème" → pastilles multiples (themes: text[])
    if (col.key === "theme") {
      const themes = Array.isArray(chapter.themes) ? chapter.themes : [];
      return (
        <ThemePills
          themes={themes}
          onChange={(next) => saveChapterField(chapter.id, "themes", next)}
        />
      );
    }

    if (col.type === "title") {
      const statusInfo = STATUS_LABELS[chapter.status] ?? STATUS_LABELS.a_ecrire;
      return (
        <div className="flex items-start gap-2 min-w-0">
          <button
            onClick={() => cycleStatus(chapter.id, chapter.status)}
            title={`Statut : ${statusInfo.label}`}
            className={`mt-[9px] ml-2 shrink-0 w-1.5 h-1.5 rounded-full cursor-pointer ${dotClassFor(chapter.status)}`}
          />
          <div className="flex-1 min-w-0">
            <EditableCell
              value={chapter.title}
              onSave={(val) => saveChapterField(chapter.id, "title", val)}
              className="text-text-primary font-medium"
            />
          </div>
        </div>
      );
    }

    if (col.type === "status") {
      const statusInfo = STATUS_LABELS[chapter.status] ?? STATUS_LABELS.a_ecrire;
      return (
        <div className="flex items-center px-2">
          <button
            onClick={() => cycleStatus(chapter.id, chapter.status)}
            className={`text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${statusInfo.color}`}
          >
            {statusInfo.label}
          </button>
        </div>
      );
    }

    if (col.type === "words") {
      return (
        <div className="px-2 py-1.5 text-[12px] text-text-tertiary text-right flex items-center justify-end">
          {chapter.word_count > 0 ? chapter.word_count.toLocaleString("fr-FR") : "—"}
        </div>
      );
    }

    if (col.type === "custom" && col.customId) {
      const cv = cellValues.find(
        (v) => v.column_id === col.customId && v.chapter_id === chapter.id
      );
      return (
        <EditableCell
          value={cv?.value ?? ""}
          onSave={(val) => saveCellValue(col.customId!, chapter.id, val)}
          className="text-text-secondary"
        />
      );
    }

    // Default: text field on chapter
    if (col.field) {
      const fieldValue = (chapter as unknown as Record<string, unknown>)[col.field] as string | null;
      return (
        <EditableCell
          value={fieldValue ?? ""}
          onSave={(val) => saveChapterField(chapter.id, col.field!, val || null)}
          className="text-text-secondary"
        />
      );
    }

    return <div className="px-2 py-1.5 text-[12px] text-text-quaternary">—</div>;
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-4 pb-6 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 mb-3 shrink-0">
        {showAddColumn ? (
          <form onSubmit={handleAddColumn} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Nom de la colonne"
              autoFocus
              className="h-8 px-2.5 text-[12px] bg-bg-secondary border border-[var(--color-accent-border)] rounded-[var(--radius-md)] text-text-primary focus:outline-none w-[180px]"
            />
            <button
              type="submit"
              className="h-8 px-3 text-[12px] rounded-[var(--radius-md)] cursor-pointer"
              style={{ background: "var(--color-accent)", color: "#1a1410" }}
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setShowAddColumn(false)}
              className="h-8 px-2 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              ✕
            </button>
          </form>
        ) : (
          <ToolbarButton onClick={() => setShowAddColumn(true)} icon="+">
            Colonne
          </ToolbarButton>
        )}

        {/* Column visibility toggle */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            active={showColumnMenu}
            icon={
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="4" height="10" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="2" width="4" height="10" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            }
          >
            Afficher/masquer
            {hiddenColumns.size > 0 && (
              <span className="ml-1 text-text-quaternary">({hiddenColumns.size})</span>
            )}
          </ToolbarButton>
          {showColumnMenu && (
            <div className="absolute top-full left-0 mt-1 bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl z-50 py-1.5 w-[260px] max-h-[320px] overflow-y-auto">
              {allColumnDefs.map((col) => {
                const isCustom = !!col.customId;
                const isLocked = col.key === "chapitre";
                return (
                  <div
                    key={col.key}
                    className={`group flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.04] ${
                      isLocked ? "opacity-50" : ""
                    }`}
                  >
                    <button
                      onClick={() => {
                        if (isLocked) return;
                        toggleColumn(col.key);
                      }}
                      className={`flex items-center gap-2.5 flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer ${
                        isLocked ? "cursor-default" : ""
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center text-[9px] shrink-0 ${
                          hiddenColumns.has(col.key)
                            ? "border-white/20"
                            : "border-[var(--color-accent)] text-[var(--color-accent)]"
                        }`}
                        style={
                          !hiddenColumns.has(col.key)
                            ? { background: "var(--color-accent-bg)" }
                            : undefined
                        }
                      >
                        {!hiddenColumns.has(col.key) && "✓"}
                      </span>
                      <span className="text-text-secondary truncate">{col.label}</span>
                    </button>
                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomColumn(col.customId!, col.label);
                        }}
                        title="Supprimer cette colonne personnalisée"
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-text-quaternary hover:text-[#e89494] hover:bg-white/[0.04] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none"
                      >
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M3 4H11M5.5 4V3C5.5 2.72 5.72 2.5 6 2.5H8C8.28 2.5 8.5 2.72 8.5 3V4M4.5 4V11.5C4.5 11.78 4.72 12 5 12H9C9.28 12 9.5 11.78 9.5 11.5V4M6 6V10M8 6V10"
                            stroke="currentColor"
                            strokeWidth="1.1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ToolbarButton
          icon={
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M2 3H12M4 7H10M6 11H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
          onClick={() => {}}
          disabled
          title="Bientôt"
        >
          Filtres
        </ToolbarButton>

        <span className="ml-auto text-[11px] text-text-quaternary italic font-serif inline-flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className="opacity-60">
            <path d="M3 8V3H11M11 3L8 6M11 3L8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1)" />
          </svg>
          Tout est modifiable en cours de création
        </span>
      </div>

      {/* Table with scroll indicators */}
      <div className="relative flex-1 min-h-0">
        {/* Left scroll indicator */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-bg-primary/80 to-transparent z-20 pointer-events-none" />
        )}
        {/* Right scroll indicator */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-bg-primary/80 to-transparent z-20 pointer-events-none" />
        )}

        <div
          ref={tableWrapperRef}
          className="overflow-auto h-full border border-white/[0.06] rounded-[var(--radius-lg)] bg-bg-secondary/30"
        >
          <div style={{ minWidth: "max-content" }}>
            {/* Header — opaque pour ne pas laisser transparaître les lignes au scroll */}
            <div
              className="grid border-b border-white/[0.08] sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
              style={{
                gridTemplateColumns: gridTemplate,
                background: "var(--color-bg-tertiary)",
              }}
            >
              {visibleColumns.map((col) => {
                const colColor = columnColors[col.key];
                const isDragOver = dragOverColKey === col.key && dragColKey !== col.key;
                return (
                  <div
                    key={col.key}
                    className={`relative flex flex-col group/col transition-colors ${
                      isDragOver ? "bg-[var(--color-accent-bg)]" : ""
                    }`}
                  >
                    <div
                      className="flex-1 px-3 py-2.5 text-[10px] font-medium text-text-quaternary uppercase select-none whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ letterSpacing: "0.16em" }}
                      title={col.label}
                    >
                      {col.label}
                    </div>
                    {/* Poignée colonne — visible au hover du header. Sert à
                        ouvrir la palette ET à drag-and-drop pour réordonner. */}
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragColKey(col.key)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverColKey(col.key);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleColDrop();
                      }}
                      onDragEnd={() => {
                        setDragColKey(null);
                        setDragOverColKey(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setPalette({
                          kind: "col",
                          colKey: col.key,
                          anchor: { top: r.bottom + 4, left: r.left },
                        });
                      }}
                      title="Couleur · glisser pour réordonner"
                      className="h-1.5 mx-2 mb-1 rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity cursor-grab"
                      style={{
                        background: colColor ?? "rgba(255,255,255,0.18)",
                        outline: colColor ? "1px solid rgba(0,0,0,0.15)" : undefined,
                      }}
                    />
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => handleColumnResize(col.key, e)}
                      className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-[var(--color-accent-border)] z-10"
                    />
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {sorted.map((chapter, idx) => {
              const rowColor = chapter.row_color ?? null;
              return (
                <div
                  key={chapter.id}
                  className={`group/row relative grid border-b border-white/[0.04] last:border-b-0 transition-colors items-start ${
                    dragOverRowIdx === idx && dragRowIdx !== idx
                      ? "border-t-2 border-t-[var(--color-accent)]"
                      : ""
                  }`}
                  style={{
                    gridTemplateColumns: gridTemplate,
                    background: rowColor ?? undefined,
                  }}
                  onDragOver={(e) => {
                    if (dragRowIdx !== null) {
                      e.preventDefault();
                      setDragOverRowIdx(idx);
                    }
                  }}
                >
                  {/* Poignée ligne — visible au hover. Click ouvre la palette,
                      drag réordonne. Largeur 5px sur le bord gauche. */}
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      setDragRowIdx(idx);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      if (dragRowIdx !== null) handleRowDrop();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPalette({
                        kind: "row",
                        chapterId: chapter.id,
                        anchor: { top: r.bottom + 4, left: r.right + 4 },
                      });
                    }}
                    title="Couleur · glisser pour réordonner"
                    className="absolute left-0 top-1 bottom-1 w-1 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab z-10"
                    style={{
                      background: rowColor ?? "var(--color-accent)",
                    }}
                  />

                  {visibleColumns.map((col) => {
                    const cellColor = getCellColor(chapter, col);
                    const colColor = columnColors[col.key];
                    return (
                      <div
                        key={col.key}
                        className="group/cell relative last:border-r-0"
                        style={{
                          background: cellColor ?? colColor ?? undefined,
                        }}
                      >
                        {renderCell(col, chapter)}
                        {/* Pastille de coloration cellule — coin sup. droit */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPalette({
                              kind: "cell",
                              chapterId: chapter.id,
                              colKey: col.key,
                              anchor: { top: r.bottom + 4, left: r.left - 80 },
                            });
                          }}
                          title="Couleur de la cellule"
                          className="absolute top-1 right-1 w-3 h-3 rounded-full opacity-0 group-hover/cell:opacity-90 transition-opacity cursor-pointer z-10 border border-white/40"
                          style={{
                            background: cellColor ?? "rgba(255,255,255,0.25)",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Add row — "+" discret après la dernière ligne */}
            <button
              onClick={handleAddChapter}
              title="Ajouter un chapitre"
              className="w-full py-2.5 flex items-center justify-center text-text-quaternary hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)]/40 cursor-pointer transition-colors border-none bg-transparent group"
            >
              <span className="w-6 h-6 rounded-full border border-dashed border-white/[0.12] group-hover:border-[var(--color-accent-border)] flex items-center justify-center text-[13px] leading-none transition-colors">
                +
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close column menu */}
      {showColumnMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnMenu(false)}
        />
      )}

      {/* Palette flottante — couleurs ligne / colonne / cellule */}
      {palette && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPalette(null)}
          />
          <div
            className="fixed z-50 bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl p-2 flex flex-col gap-1"
            style={{
              top: Math.min(palette.anchor.top, window.innerHeight - 100),
              left: Math.max(8, Math.min(palette.anchor.left, window.innerWidth - 220)),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-1 pb-1 text-[9px] uppercase text-text-quaternary tracking-wider">
              {palette.kind === "row" ? "Couleur de la ligne"
                : palette.kind === "col" ? "Couleur de la colonne"
                : "Couleur de la cellule"}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => applyPaletteColor(c.hex)}
                  title={c.label}
                  className="w-8 h-8 rounded-[var(--radius-sm)] border border-white/[0.08] cursor-pointer hover:scale-110 transition-transform"
                  style={{ background: c.hex }}
                />
              ))}
            </div>
            <button
              onClick={() => applyPaletteColor(null)}
              className="mt-1 h-7 px-2 text-[11px] text-text-tertiary border border-white/[0.08] rounded-[var(--radius-sm)] bg-transparent hover:bg-bg-hover cursor-pointer transition-colors"
            >
              Effacer la couleur
            </button>
          </div>
        </>
      )}
    </div>
  );
}
