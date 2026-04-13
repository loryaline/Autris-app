"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const STATUS_DOT: Record<string, string> = {
  a_ecrire: "bg-[#ccc]",
  premier_jet: "bg-[#888780]",
  revision: "bg-amber",
  reecriture: "bg-primary",
  correction: "bg-teal",
  termine: "bg-[#1D9E75]",
};

interface ChapterItem {
  id: string;
  title: string;
  position: number;
  status: string;
}

function ChapterRow({
  chapter,
  isActive,
  isFocused,
  onSelect,
  onRename,
  onDelete,
  canDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver,
}: {
  chapter: ChapterItem;
  isActive: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(chapter.title);
  const [showConfirm, setShowConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (isFocused && !editing && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isFocused, editing]);

  function commitRename() {
    setEditing(false);
    if (editValue.trim() && editValue.trim() !== chapter.title) {
      onRename(editValue.trim());
    } else {
      setEditValue(chapter.title);
    }
  }

  if (showConfirm) {
    return (
      <div className="px-2 py-1.5 text-[11px] bg-red-bg rounded mb-0.5">
        <div className="text-red font-medium mb-1">Supprimer « {chapter.title} » ?</div>
        <div className="flex gap-1">
          <button
            onClick={() => { setShowConfirm(false); onDelete(); }}
            className="px-1.5 py-0.5 bg-red text-white rounded text-[11px] cursor-pointer border-none"
          >
            Supprimer
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-1.5 py-0.5 bg-bg-primary text-text-secondary rounded text-[11px] cursor-pointer border border-border"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative mb-0.5 ${isDragOver ? "border-t-2 border-t-primary" : ""}`}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e);
      }}
      onDragEnd={onDragEnd}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setEditValue(chapter.title); setEditing(false); }
          }}
          className="block w-full px-2 py-[4px] text-[12px] border border-primary-border rounded bg-bg-primary text-text-primary outline-none"
        />
      ) : (
        <button
          ref={buttonRef}
          onClick={onSelect}
          onDoubleClick={() => { setEditing(true); setEditValue(chapter.title); }}
          className={`flex items-center gap-1.5 w-full text-left px-2 py-[5px] text-[12px] rounded cursor-grab transition-colors outline-none ${
            isActive
              ? "bg-bg-tertiary text-text-primary font-medium border-l-2 border-l-primary pl-1.5"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover border-l-2 border-l-transparent"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[chapter.status] ?? STATUS_DOT.a_ecrire}`} />
          {chapter.title}
        </button>
      )}

      {/* Hover actions */}
      {!editing && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
              title="Supprimer"
              className="w-4 h-4 flex items-center justify-center text-[10px] text-text-tertiary hover:text-red hover:bg-red-bg rounded cursor-pointer border-none bg-transparent"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function StructurePanel({
  novelTitle,
  chapters,
  activeChapterId,
  onChapterSelect,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  onMoveChapter,
}: {
  novelTitle: string;
  chapters: ChapterItem[];
  activeChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
  onAddChapter: () => void;
  onRenameChapter: (chapterId: string, newTitle: string) => void;
  onDeleteChapter: (chapterId: string) => void;
  onMoveChapter: (chapterId: string, toIndex: number) => void;
}) {
  const sorted = [...chapters].sort((a, b) => a.position - b.position);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [dragFromId, setDragFromId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (sorted.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((prev) => Math.min(prev + 1, sorted.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusedIdx >= 0 && focusedIdx < sorted.length) {
      e.preventDefault();
      onChapterSelect(sorted[focusedIdx].id);
    }
  }, [sorted, focusedIdx, onChapterSelect]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragFromId !== null && dragOverIdx !== null) {
      onMoveChapter(dragFromId, dragOverIdx);
    }
    setDragFromId(null);
    setDragOverIdx(null);
  }

  return (
    <div
      ref={panelRef}
      className="h-full border-r border-border p-2.5 bg-bg-secondary overflow-y-auto flex flex-col outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Novel title */}
      <div className="text-[13px] font-semibold text-text-primary mb-3 px-1">
        {novelTitle}
      </div>

      {/* Chapter list */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
          Chapitres
        </span>
        <button
          onClick={onAddChapter}
          title="Ajouter un chapitre"
          className="w-4 h-4 flex items-center justify-center text-[12px] text-text-tertiary hover:text-primary hover:bg-primary-bg rounded cursor-pointer border-none bg-transparent transition-colors"
        >
          +
        </button>
      </div>

      <div className="flex-1">
        {sorted.length === 0 ? (
          <div className="text-[12px] text-text-quaternary italic px-1">
            Aucun chapitre
          </div>
        ) : (
          sorted.map((chapter, idx) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              isActive={activeChapterId === chapter.id}
              isFocused={focusedIdx === idx}
              onSelect={() => onChapterSelect(chapter.id)}
              onRename={(title) => onRenameChapter(chapter.id, title)}
              onDelete={() => onDeleteChapter(chapter.id)}
              canDelete={sorted.length > 1}
              onDragStart={() => setDragFromId(chapter.id)}
              onDragOver={() => setDragOverIdx(idx)}
              onDragEnd={() => { setDragFromId(null); setDragOverIdx(null); }}
              isDragOver={dragFromId !== null && dragOverIdx === idx && dragFromId !== chapter.id}
            />
          ))
        )}
      </div>

      {/* Add chapter button */}
      <button
        onClick={onAddChapter}
        className="mt-2 w-full py-1 text-[12px] text-primary border border-dashed border-primary-border rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:bg-primary-bg transition-colors"
      >
        + Chapitre
      </button>
    </div>
  );
}
