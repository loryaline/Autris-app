"use client";

import { useState } from "react";
import { PlanningSubSidebar, type PlanningView } from "@/components/planning/PlanningSubSidebar";
import { ChapterTable } from "@/components/planning/ChapterTable";
import { OutlineView } from "@/components/planning/OutlineView";
import { StructureBand } from "@/components/planning/StructureBand";
import { getNarrativeMethod } from "@/lib/narrative-methods";
import type { ChapterStatus } from "@/types/database";

/** Beat de structure narrative (table planning_beats). */
export interface PlanningBeat {
  id: string;
  method: string;
  beat_key: string;
  label: string;
  description: string | null;
  act: string | null;
  position: number;
  chapter_id: string | null;
  done: boolean;
  note: string | null;
}

/* ---- Export CSV ---- */
// Mapping clé de colonne → libellé + extraction depuis ChapterData.
// Doit rester aligné avec DEFAULT_COLUMNS dans ChapterTable.tsx.
const DEFAULT_COL_MAP: Record<
  string,
  { label: string; extract: (c: ChapterData) => string }
> = {
  chapitre:       { label: "Chapitre",                    extract: (c) => c.title ?? "" },
  theme:          { label: "Thème",                       extract: (c) => (c.themes ?? []).join(" · ") },
  resume:         { label: "Résumé du Chapitre",          extract: (c) => c.synopsis ?? "" },
  plot_elements:  { label: "Éléments intrigue globale",   extract: (c) => c.plot_elements ?? "" },
  minor_elements: { label: "Éléments mineurs/ambiances",  extract: (c) => c.minor_elements ?? "" },
  observations:   { label: "Observations / remarques",    extract: (c) => c.observations ?? "" },
  tension:        { label: "Indices/tension relative",    extract: (c) => c.tension_indices ?? "" },
  pivot:          { label: "Bascule",                     extract: (c) => c.pivot ?? "" },
  noeud:          { label: "Nœud narratif",               extract: (c) => c.narrative_knot ?? "" },
};
const DEFAULT_KEYS = Object.keys(DEFAULT_COL_MAP);

function stripHtml(html: string): string {
  if (!html) return "";
  // Remplace les balises de bloc par un saut de ligne, retire les autres,
  // puis decode quelques entités HTML usuelles. Largement suffisant pour
  // les cellules TipTap (gras / italique / souligné / couleur / surlignage).
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function csvEscape(value: string): string {
  // RFC 4180 : si la valeur contient ; , " ou un saut de ligne, la quoter
  // et doubler les guillemets internes. On utilise ; comme séparateur (Excel FR).
  if (/[;,"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildChapterCsv(
  chapters: ChapterData[],
  customColumns: CustomColumn[],
  cellValues: CellValue[],
  columnOrder: string[] | null | undefined,
): string {
  // Ordre des colonnes par défaut respecté ; on filtre les clés inconnues.
  // Les colonnes custom sont ajoutées à la fin, dans leur ordre `position`.
  const orderedDefaults = (columnOrder && columnOrder.length > 0
    ? columnOrder.filter((k) => k in DEFAULT_COL_MAP)
    : DEFAULT_KEYS);

  const customSorted = [...customColumns].sort(
    (a, b) => a.position - b.position,
  );

  // Index cellValues par (column_id, chapter_id) pour lookup O(1)
  const cellIndex = new Map<string, string>();
  for (const v of cellValues) {
    cellIndex.set(`${v.column_id}::${v.chapter_id}`, v.value ?? "");
  }

  const headers = [
    "Position",
    ...orderedDefaults.map((k) => DEFAULT_COL_MAP[k].label),
    ...customSorted.map((c) => c.name),
    "Statut",
    "Mots",
  ];

  const STATUS_LABEL: Record<ChapterStatus, string> = {
    a_ecrire:    "À écrire",
    premier_jet: "Premier jet",
    revision:    "Révision",
    reecriture:  "Réécriture",
    correction:  "Correction",
    termine:     "Terminé",
  };

  const rows = chapters
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c, idx) => {
      const cells = [
        String(idx + 1),
        ...orderedDefaults.map((k) => stripHtml(DEFAULT_COL_MAP[k].extract(c))),
        ...customSorted.map((col) =>
          stripHtml(cellIndex.get(`${col.id}::${c.id}`) ?? ""),
        ),
        STATUS_LABEL[c.status] ?? c.status,
        String(c.word_count ?? 0),
      ];
      return cells.map(csvEscape).join(";");
    });

  // BOM UTF-8 pour qu'Excel reconnaisse l'encodage
  return "﻿" + [headers.map(csvEscape).join(";"), ...rows].join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "chapitrage";
}

export interface ChapterData {
  id: string;
  title: string;
  position: number;
  status: ChapterStatus;
  synopsis: string | null;
  word_count: number;
  themes: string[];
  plot_elements: string | null;
  minor_elements: string | null;
  observations: string | null;
  tension_indices: string | null;
  pivot: string | null;
  narrative_knot: string | null;
  /** Tint de fond de la ligne entière (hex, ex. "#fde68a"). Null = aucune. */
  row_color?: string | null;
  /** Map { [colKey]: hex } pour les cases de colonnes par défaut. */
  cell_colors?: Record<string, string>;
}

export interface SceneData {
  id: string;
  chapter_id: string;
  title: string;
  position: number;
  status: "todo" | "in_progress" | "done";
}

export interface CustomColumn {
  id: string;
  name: string;
  type: string;
  position: number;
}

export interface CellValue {
  id: string;
  column_id: string;
  chapter_id: string;
  value: string | null;
  color?: string | null;
}

interface Milestone {
  id: string;
  title: string;
  type: string;
  status: string;
  color: string | null;
  target_date?: string | null;
}

export function PlanningClient({
  novelId,
  novelTitle,
  projectTitle,
  chapters: initialChapters,
  customColumns: initialCustomColumns,
  cellValues: initialCellValues,
  scenes: initialScenes,
  milestones,
  columnOrder,
  columnColors: initialColumnColors,
  columnWidths: initialColumnWidths,
  narrativeTemplate,
  beats: initialBeats,
  showTips,
}: {
  novelId: string;
  novelTitle: string;
  projectTitle: string;
  chapters: ChapterData[];
  customColumns: CustomColumn[];
  cellValues: CellValue[];
  scenes: SceneData[];
  milestones: Milestone[];
  columnOrder?: string[] | null;
  columnColors?: Record<string, string>;
  columnWidths?: Record<string, number>;
  narrativeTemplate: string;
  beats: PlanningBeat[];
  showTips: boolean;
}) {
  const [activeView, setActiveView] = useState<PlanningView>("tableau");
  const [chapters, setChapters] = useState<ChapterData[]>(initialChapters);
  const [scenes, setScenes] = useState<SceneData[]>(initialScenes);
  const [method, setMethod] = useState<string>(narrativeTemplate);
  const [beats, setBeats] = useState<PlanningBeat[]>(initialBeats);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(initialCustomColumns);
  const [cellValues, setCellValues] = useState<CellValue[]>(initialCellValues);

  // État partagé du tableau — remonté ici pour survivre à un changement
  // de vue (Tableau ↔ Outline ↔ Post-its). Sinon ChapterTable se démonte
  // et perd ses largeurs/couleurs/ordre tant qu'il n'y a pas eu de
  // router.refresh().
  const [tableColumnOrder, setTableColumnOrder] = useState<string[] | null>(
    columnOrder ?? null,
  );
  const [tableColumnColors, setTableColumnColors] = useState<Record<string, string>>(
    initialColumnColors ?? {},
  );
  const [tableColumnWidths, setTableColumnWidths] = useState<Record<string, number>>(
    initialColumnWidths ?? {},
  );

  const chapterCount = chapters.length;
  const sceneCount = scenes.length;

  // Beats rattachés, indexés par chapitre — pour les badges du Chapitrage.
  const beatBadges: Record<string, { label: string; act: string | null }[]> = {};
  for (const b of beats) {
    if (!b.chapter_id) continue;
    (beatBadges[b.chapter_id] ??= []).push({ label: b.label, act: b.act });
  }
  const viewLabel =
    activeView === "tableau"
      ? "Chapitrage"
      : activeView === "outline"
        ? "Outline"
        : activeView === "postits"
          ? "Post-its"
          : "Gantt";

  return (
    <div className="flex h-full">
      {/* Sub-sidebar */}
      <PlanningSubSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        milestones={milestones}
        novelId={novelId}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-primary">
        {/* Breadcrumb */}
        <div className="h-10 flex items-center px-6 border-b border-white/[0.04] shrink-0">
          <span className="text-[12.5px] text-text-tertiary">{projectTitle}</span>
          <span className="mx-2 text-text-quaternary/60 text-[11px]">/</span>
          <span className="text-[12.5px] text-text-tertiary">{novelTitle}</span>
          <span className="mx-2 text-text-quaternary/60 text-[11px]">/</span>
          <span className="text-[12.5px] text-text-primary font-medium">
            Planification
            {activeView !== "tableau" && (
              <span className="text-text-tertiary font-normal">
                {" · "}
                {viewLabel}
              </span>
            )}
          </span>
        </div>

        {/* Hero title zone */}
        {activeView === "outline" ? (
          <div className="px-6 pt-8 pb-6 border-b border-white/[0.04] shrink-0 text-center">
            <div
              className="text-[10px] font-medium text-text-quaternary uppercase mb-2 flex items-center justify-center gap-2.5"
              style={{ letterSpacing: "0.18em" }}
            >
              <span className="text-[var(--color-accent)]">◆</span>
              <span>Déroulé narratif</span>
              <span className="text-text-quaternary/40">·</span>
              <span>Vue scènes</span>
            </div>
            <h1 className="font-serif text-[38px] leading-[1.05] tracking-tight text-text-primary">
              L&apos;histoire,{" "}
              <span className="italic text-[var(--color-accent)]/95">
                scène par scène
              </span>
            </h1>
            <div className="mt-2 text-[12.5px] text-text-tertiary font-serif italic">
              {novelTitle}
              <span className="mx-2 text-text-quaternary/50 not-italic">·</span>
              <span className="not-italic">
                {chapterCount} chapitre{chapterCount > 1 ? "s" : ""}
              </span>
              <span className="mx-2 text-text-quaternary/50 not-italic">·</span>
              <span className="not-italic">
                {sceneCount} scène{sceneCount > 1 ? "s" : ""} planifiée
                {sceneCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.04] shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase mb-2 flex items-center gap-2"
                  style={{ letterSpacing: "0.18em" }}
                >
                  <span>Planification</span>
                  <span className="text-text-quaternary/40">·</span>
                  <span>{viewLabel}</span>
                </div>
                <h1 className="font-serif text-[34px] leading-[1.05] tracking-tight text-text-primary">
                  {renderSerifTitle(novelTitle)}
                </h1>
                <div className="mt-1.5 text-[12px] text-text-tertiary">
                  <span>
                    {chapterCount} chapitre{chapterCount > 1 ? "s" : ""}
                  </span>
                  {milestones.length > 0 && (
                    <>
                      <span className="mx-2 text-text-quaternary/50">·</span>
                      <span>
                        {milestones.length} jalon
                        {milestones.length > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
                {showTips && (
                  <div className="mt-1.5 text-[11.5px] text-text-quaternary italic">
                    Astuce : cliquez sur la pastille de statut d&apos;un chapitre pour le faire évoluer.
                  </div>
                )}
              </div>

              {activeView === "tableau" && (
                <div className="flex flex-col items-end gap-2 pt-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const csv = buildChapterCsv(
                          chapters,
                          customColumns,
                          cellValues,
                          columnOrder,
                        );
                        downloadCsv(`${slugify(novelTitle)}-chapitrage.csv`, csv);
                      }}
                      title="Télécharger le tableau au format CSV (Excel, Numbers, LibreOffice)"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.08] text-[12.5px] text-text-secondary hover:text-text-primary hover:border-white/[0.15] cursor-pointer transition-colors"
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
                      Exporter
                    </button>
                    <button
                      onClick={() =>
                        window.dispatchEvent(new CustomEvent("autris:add-chapter"))
                      }
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-[12.5px] font-medium cursor-pointer transition-colors"
                      style={{
                        background: "var(--color-accent)",
                        color: "#1a1410",
                      }}
                    >
                      <span className="text-[14px] leading-none">+</span>
                      Nouveau chapitre
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent("autris:change-method"))
                    }
                    title="Changer la méthode narrative (3 actes, voyage du héros…)"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.08] text-[12px] text-text-tertiary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer transition-colors"
                  >
                    <span className="text-[11px] leading-none">◆</span>
                    Méthode narrative
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active view */}
        {activeView === "tableau" &&
          (() => {
            const isProcess = getNarrativeMethod(method).kind === "process";
            const band = (
              <StructureBand
                novelId={novelId}
                method={method}
                beats={beats}
                chapters={chapters.map((c) => ({
                  id: c.id,
                  title: c.title,
                  position: c.position,
                }))}
                onBeatsChange={setBeats}
                onMethodChange={setMethod}
                layout={isProcess ? "panel" : "band"}
              />
            );
            const table = (
              <ChapterTable
                novelId={novelId}
                chapters={chapters}
                setChapters={setChapters}
                customColumns={customColumns}
                setCustomColumns={setCustomColumns}
                cellValues={cellValues}
                setCellValues={setCellValues}
                columnOrder={tableColumnOrder}
                setColumnOrder={setTableColumnOrder}
                columnColors={tableColumnColors}
                setColumnColors={setTableColumnColors}
                columnWidths={tableColumnWidths}
                setColumnWidths={setTableColumnWidths}
                beatBadges={beatBadges}
              />
            );
            // Méthode « process » (Snowflake) : la checklist est haute, on la
            // place en panneau latéral entre la sous-sidebar et le tableau.
            // Méthodes « beats » : bande compacte au-dessus du tableau.
            return isProcess ? (
              <div className="flex flex-1 min-h-0">
                {band}
                {table}
              </div>
            ) : (
              <>
                {band}
                {table}
              </>
            );
          })()}

        {activeView === "outline" && (
          <OutlineView
            novelId={novelId}
            chapters={chapters}
            setChapters={setChapters}
            scenes={scenes}
            setScenes={setScenes}
          />
        )}

        {activeView === "postits" && (
          <div className="flex-1 flex items-center justify-center text-text-quaternary text-[14px]">
            <div className="text-center">
              <div className="text-[32px] mb-2">📌</div>
              <div>Les Post-its arrivent bientôt</div>
            </div>
          </div>
        )}

        {activeView === "gantt" && (
          <div className="flex-1 flex items-center justify-center text-text-quaternary text-[14px]">
            <div className="text-center">
              <div className="text-[32px] mb-2">📊</div>
              <div>Le Gantt arrive bientôt</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Titre serif avec le dernier mot mis en italique accent. */
function renderSerifTitle(title: string): React.ReactNode {
  const t = (title ?? "").trim();
  if (!t) return <span className="text-text-quaternary italic">Sans titre</span>;
  const parts = t.split(/\s+/);
  if (parts.length <= 1) return t;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")}{" "}
      <span className="italic text-[var(--color-accent)]/95">{last}</span>
    </>
  );
}
