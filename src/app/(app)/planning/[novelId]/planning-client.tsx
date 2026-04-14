"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { PlanningSubSidebar, type PlanningView } from "@/components/planning/PlanningSubSidebar";
import { ChapterTable } from "@/components/planning/ChapterTable";
import { OutlineView } from "@/components/planning/OutlineView";
import type { ChapterStatus, Tempo } from "@/types/database";

export interface ChapterData {
  id: string;
  title: string;
  position: number;
  status: ChapterStatus;
  synopsis: string | null;
  word_count: number;
  tempo: Tempo | null;
  theme: string | null;
  plot_elements: string | null;
  minor_elements: string | null;
  observations: string | null;
  tension_indices: string | null;
  pivot: string | null;
  narrative_knot: string | null;
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
}

interface Milestone {
  id: string;
  title: string;
  type: string;
  status: string;
  color: string | null;
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
}) {
  const [activeView, setActiveView] = useState<PlanningView>("tableau");
  const [chapters, setChapters] = useState<ChapterData[]>(initialChapters);
  const [scenes, setScenes] = useState<SceneData[]>(initialScenes);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(initialCustomColumns);
  const [cellValues, setCellValues] = useState<CellValue[]>(initialCellValues);

  return (
    <div className="flex h-full">
      {/* Sub-sidebar */}
      <PlanningSubSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        milestones={milestones}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-10 flex items-center px-4 border-b border-border bg-bg-primary shrink-0">
          <span className="text-[13px] text-text-tertiary">
            {projectTitle}
          </span>
          <span className="mx-1.5 text-text-quaternary">/</span>
          <span className="text-[13px] text-text-primary font-medium">
            {novelTitle}
          </span>
          <span className="mx-1.5 text-text-quaternary">/</span>
          <span className="text-[13px] text-text-tertiary">Planification</span>
        </div>

        {/* Active view */}
        {activeView === "tableau" && (
          <ChapterTable
            novelId={novelId}
            chapters={chapters}
            setChapters={setChapters}
            customColumns={customColumns}
            setCustomColumns={setCustomColumns}
            cellValues={cellValues}
            setCellValues={setCellValues}
            initialColumnOrder={columnOrder}
          />
        )}

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
