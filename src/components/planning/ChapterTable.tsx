"use client";

import { useState, useRef, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChapterStatus, Tempo } from "@/types/database";
import type { ChapterData as ChapterRow, CustomColumn, CellValue } from "@/app/(app)/planning/[novelId]/planning-client";

/* ---- Column definitions ---- */
interface ColumnDef {
  key: string;
  label: string;
  width: string;
  type: "title" | "text" | "tempo" | "status" | "words" | "custom";
  field?: string; // chapter field name
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "chapitre", label: "Chapitre", width: "160px", type: "title", field: "title" },
  { key: "theme", label: "Thème", width: "120px", type: "text", field: "theme" },
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

/* ---- Status & Tempo ---- */
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

const TEMPO_LABELS: Record<Tempo, { label: string; color: string }> = {
  lent: { label: "Lent", color: "bg-blue/15 text-blue" },
  moyen: { label: "Moyen", color: "bg-amber/15 text-amber" },
  rapide: { label: "Rapide", color: "bg-red/15 text-red" },
};

const TEMPO_ORDER: (Tempo | null)[] = [null, "lent", "moyen", "rapide"];

/* ---- Types (imported from planning-client) ---- */

/* ---- Editable Cell ---- */
function EditableCell({
  value,
  onSave,
  className,
  placeholder,
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function startEdit() {
    setEditValue(value);
    setEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      }
    }, 0);
  }

  function commit() {
    setEditing(false);
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full px-2 py-1 text-[12px] bg-bg-primary border border-primary-border rounded outline-none text-text-primary resize-none min-h-[28px]"
      />
    );
  }

  return (
    <div
      onClick={startEdit}
      className={`px-2 py-1.5 text-[12px] cursor-text min-h-[28px] whitespace-pre-wrap break-words ${className ?? ""}`}
      title={value || undefined}
    >
      {value || (
        <span className="text-text-quaternary">{placeholder ?? "—"}</span>
      )}
    </div>
  );
}

/* ---- Main Table ---- */
export function ChapterTable({
  novelId,
  chapters,
  setChapters,
  customColumns,
  setCustomColumns,
  cellValues,
  setCellValues,
  initialColumnOrder,
}: {
  novelId: string;
  chapters: ChapterRow[];
  setChapters: Dispatch<SetStateAction<ChapterRow[]>>;
  customColumns: CustomColumn[];
  setCustomColumns: Dispatch<SetStateAction<CustomColumn[]>>;
  cellValues: CellValue[];
  setCellValues: Dispatch<SetStateAction<CellValue[]>>;
  initialColumnOrder?: string[] | null;
}) {
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

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
    async (chapterId: string, field: string, value: string | null) => {
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c))
      );
      await supabaseRef.current
        .from("chapters")
        .update({ [field]: value })
        .eq("id", chapterId);
    },
    []
  );

  /* ---- Status cycle ---- */
  function cycleStatus(chapterId: string, current: ChapterStatus) {
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    saveChapterField(chapterId, "status", next);
  }

  /* ---- Tempo cycle ---- */
  function cycleTempo(chapterId: string, current: Tempo | null) {
    const idx = TEMPO_ORDER.indexOf(current);
    const next = TEMPO_ORDER[(idx + 1) % TEMPO_ORDER.length];
    saveChapterField(chapterId, "tempo", next);
  }

  /* ---- Add chapter ---- */
  async function handleAddChapter() {
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
      .select("id, title, position, status, synopsis, word_count, tempo, theme, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot")
      .single();

    if (data) {
      setChapters((prev) => [...prev, data as ChapterRow]);
    }
  }

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
    if (col.type === "title") {
      return (
        <EditableCell
          value={chapter.title}
          onSave={(val) => saveChapterField(chapter.id, "title", val)}
          className="text-text-primary font-medium"
        />
      );
    }

    if (col.type === "tempo") {
      const tempoInfo = chapter.tempo ? TEMPO_LABELS[chapter.tempo] : null;
      return (
        <div className="flex items-center px-2">
          <button
            onClick={() => cycleTempo(chapter.id, chapter.tempo)}
            className={`text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
              tempoInfo ? tempoInfo.color : "text-text-quaternary hover:bg-bg-hover"
            }`}
          >
            {tempoInfo ? tempoInfo.label : "—"}
          </button>
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
    <div className="flex-1 flex flex-col p-4 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        {showAddColumn ? (
          <form onSubmit={handleAddColumn} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Nom de la colonne"
              autoFocus
              className="h-7 px-2 text-[12px] border border-primary-border rounded bg-bg-primary text-text-primary outline-none w-[160px]"
            />
            <button type="submit" className="h-7 px-2 text-[12px] bg-primary text-white rounded cursor-pointer">
              OK
            </button>
            <button type="button" onClick={() => setShowAddColumn(false)} className="h-7 px-2 text-[12px] text-text-tertiary cursor-pointer">
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddColumn(true)}
            className="h-7 px-2.5 text-[12px] border border-border rounded text-text-secondary hover:text-text-primary hover:border-text-tertiary cursor-pointer transition-colors bg-transparent"
          >
            + Colonne
          </button>
        )}
        <button
          onClick={handleAddChapter}
          className="h-7 px-2.5 text-[12px] border border-border rounded text-text-secondary hover:text-text-primary hover:border-text-tertiary cursor-pointer transition-colors bg-transparent"
        >
          + Chapitre
        </button>

        {/* Column visibility toggle */}
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className={`h-7 px-2.5 text-[12px] border rounded cursor-pointer transition-colors bg-transparent ${
              showColumnMenu
                ? "border-primary-border text-primary"
                : "border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary"
            }`}
            title="Afficher / masquer des colonnes"
          >
            ⊞ Colonnes{hiddenColumns.size > 0 && ` (${hiddenColumns.size} masquées)`}
          </button>
          {showColumnMenu && (
            <div className="absolute top-full left-0 mt-1 bg-bg-primary border border-border rounded-[var(--radius-md)] shadow-lg z-50 py-1 w-[220px] max-h-[300px] overflow-y-auto">
              {allColumnDefs.map((col) => (
                <button
                  key={col.key}
                  onClick={() => {
                    if (col.key === "chapitre") return; // Can't hide title
                    toggleColumn(col.key);
                  }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-[12px] cursor-pointer transition-colors hover:bg-bg-hover ${
                    col.key === "chapitre" ? "opacity-50 cursor-default" : ""
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                    hiddenColumns.has(col.key)
                      ? "border-text-quaternary"
                      : "border-primary bg-primary text-white"
                  }`}>
                    {!hiddenColumns.has(col.key) && "✓"}
                  </span>
                  <span className="text-text-secondary">{col.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="ml-auto text-[11px] text-text-quaternary italic">
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
          className="overflow-auto h-full border border-border rounded-[var(--radius-md)]"
        >
          <div style={{ minWidth: "max-content" }}>
            {/* Header */}
            <div
              className="grid bg-bg-tertiary border-b border-border sticky top-0 z-10"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {visibleColumns.map((col) => (
                <div
                  key={col.key}
                  className={`relative flex items-center transition-colors ${
                    dragOverColKey === col.key && dragColKey !== col.key
                      ? "bg-primary-bg border-l-2 border-l-primary"
                      : ""
                  }`}
                >
                  <div
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
                    onDragEnd={() => { setDragColKey(null); setDragOverColKey(null); }}
                    className="flex-1 px-2 py-2 text-[11px] font-medium text-text-tertiary uppercase tracking-wider cursor-grab select-none whitespace-nowrap overflow-hidden text-ellipsis"
                    title={col.label}
                  >
                    {col.label}
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleColumnResize(col.key, e)}
                    className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-primary-border/50 z-10"
                  />
                </div>
              ))}
            </div>

            {/* Rows */}
            {sorted.map((chapter, idx) => (
              <div
                key={chapter.id}
                className={`grid border-b border-border last:border-b-0 hover:bg-bg-hover/50 transition-colors items-start ${
                  dragOverRowIdx === idx && dragRowIdx !== idx
                    ? "border-t-2 border-t-primary"
                    : ""
                }`}
                style={{ gridTemplateColumns: gridTemplate }}
                draggable
                onDragStart={(e) => {
                  setDragRowIdx(idx);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragRowIdx !== null) setDragOverRowIdx(idx);
                }}
                onDragEnd={() => {
                  if (dragRowIdx !== null) handleRowDrop();
                }}
              >
                {visibleColumns.map((col) => (
                  <div key={col.key} className="border-r border-border/50 last:border-r-0">
                    {renderCell(col, chapter)}
                  </div>
                ))}
              </div>
            ))}

            {/* Add row */}
            <button
              onClick={handleAddChapter}
              className="w-full py-2 text-[12px] text-text-quaternary hover:text-primary hover:bg-primary-bg/30 cursor-pointer transition-colors border-none bg-transparent"
            >
              + Ajouter un chapitre
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
    </div>
  );
}
