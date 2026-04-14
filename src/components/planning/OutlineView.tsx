"use client";

import { useState, useRef, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChapterData, SceneData } from "@/app/(app)/planning/[novelId]/planning-client";

/* ---- Types ---- */
type SceneItem = SceneData;
type ChapterItem = ChapterData;

const STATUS_DOT: Record<string, string> = {
  a_ecrire: "bg-text-quaternary",
  premier_jet: "bg-[#888780]",
  revision: "bg-amber",
  reecriture: "bg-primary",
  correction: "bg-teal",
  termine: "bg-[#1D9E75]",
};

const SCENE_STATUS: Record<string, { label: string; color: string }> = {
  todo: { label: "À faire", color: "bg-bg-hover text-text-tertiary" },
  in_progress: { label: "En cours", color: "bg-amber/15 text-amber" },
  done: { label: "Fait", color: "bg-[#1D9E75]/15 text-[#1D9E75]" },
};

const SCENE_STATUS_ORDER: ("todo" | "in_progress" | "done")[] = ["todo", "in_progress", "done"];

/* ---- Editable Synopsis ---- */
function EditableSynopsis({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setEditValue(value); }, [value]);

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
    if (editValue.trim() !== value) onSave(editValue.trim());
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
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
        placeholder="Résumé du chapitre…"
        className="w-full px-3 py-2 text-[13px] bg-bg-primary border border-primary-border rounded-[var(--radius-sm)] outline-none text-text-primary resize-none min-h-[60px] leading-relaxed"
      />
    );
  }

  return (
    <div
      onClick={startEdit}
      className="px-3 py-2 text-[13px] text-text-secondary cursor-text min-h-[40px] whitespace-pre-wrap leading-relaxed rounded-[var(--radius-sm)] hover:bg-bg-hover/50 transition-colors"
    >
      {value || (
        <span className="text-text-quaternary italic">Résumé du chapitre… (cliquez pour écrire)</span>
      )}
    </div>
  );
}

/* ---- Scene Row ---- */
function SceneRow({
  scene,
  onRename,
  onDelete,
  onStatusCycle,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver,
}: {
  scene: SceneItem;
  onRename: (title: string) => void;
  onDelete: () => void;
  onStatusCycle: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(scene.title);
  const [showConfirm, setShowConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commitRename() {
    setEditing(false);
    if (editValue.trim() && editValue.trim() !== scene.title) onRename(editValue.trim());
    else setEditValue(scene.title);
  }

  const statusInfo = SCENE_STATUS[scene.status] ?? SCENE_STATUS.todo;

  if (showConfirm) {
    return (
      <div className="ml-4 px-3 py-1.5 text-[11px] bg-red-bg rounded mb-1">
        <div className="text-red font-medium mb-1">Supprimer « {scene.title} » ?</div>
        <div className="flex gap-1">
          <button onClick={() => { setShowConfirm(false); onDelete(); }} className="px-1.5 py-0.5 bg-red text-white rounded text-[11px] cursor-pointer border-none">Supprimer</button>
          <button onClick={() => setShowConfirm(false)} className="px-1.5 py-0.5 bg-bg-primary text-text-secondary rounded text-[11px] cursor-pointer border border-border">Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 ml-4 px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-bg-hover/50 transition-colors mb-0.5 ${
        isDragOver ? "border-t-2 border-t-primary" : ""
      }`}
      draggable={!editing}
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(); }}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <span className="text-[10px] text-text-quaternary cursor-grab select-none">⠿</span>

      {/* Scene title */}
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setEditValue(scene.title); setEditing(false); }
          }}
          className="flex-1 px-1.5 py-0.5 text-[12px] border border-primary-border rounded bg-bg-primary text-text-primary outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => { setEditing(true); setEditValue(scene.title); }}
          className="flex-1 text-[12px] text-text-secondary cursor-default"
        >
          {scene.title}
        </span>
      )}

      {/* Status badge */}
      <button
        onClick={onStatusCycle}
        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${statusInfo.color}`}
      >
        {statusInfo.label}
      </button>

      {/* Delete */}
      <button
        onClick={() => setShowConfirm(true)}
        className="hidden group-hover:flex w-4 h-4 items-center justify-center text-[10px] text-text-quaternary hover:text-red cursor-pointer border-none bg-transparent shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

/* ---- Main OutlineView ---- */
export function OutlineView({
  novelId,
  chapters,
  setChapters,
  scenes,
  setScenes,
}: {
  novelId: string;
  chapters: ChapterItem[];
  setChapters: Dispatch<SetStateAction<ChapterItem[]>>;
  scenes: SceneItem[];
  setScenes: Dispatch<SetStateAction<SceneItem[]>>;
}) {
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => new Set(chapters.map((c) => c.id)));

  // Scene drag state
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const sorted = [...chapters].sort((a, b) => a.position - b.position);

  function toggleChapter(id: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---- Synopsis save ---- */
  async function saveSynopsis(chapterId: string, synopsis: string) {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, synopsis: synopsis || null } : c))
    );
    await supabaseRef.current
      .from("chapters")
      .update({ synopsis: synopsis || null })
      .eq("id", chapterId);
  }

  /* ---- Scene CRUD ---- */
  async function addScene(chapterId: string) {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const chapterScenes = scenes.filter((s) => s.chapter_id === chapterId);
    const maxPos = chapterScenes.reduce((m, s) => Math.max(m, s.position), -1);

    const { data } = await supabase
      .from("scenes")
      .insert({
        chapter_id: chapterId,
        user_id: user.id,
        title: `Scène ${chapterScenes.length + 1}`,
        position: maxPos + 1,
      })
      .select("id, chapter_id, title, position, status")
      .single();

    if (data) setScenes((prev) => [...prev, data as SceneItem]);
  }

  async function renameScene(sceneId: string, title: string) {
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, title } : s)));
    await supabaseRef.current.from("scenes").update({ title }).eq("id", sceneId);
  }

  async function deleteScene(sceneId: string) {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    await supabaseRef.current.from("scenes").delete().eq("id", sceneId);
  }

  async function cycleSceneStatus(sceneId: string) {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const idx = SCENE_STATUS_ORDER.indexOf(scene.status);
    const next = SCENE_STATUS_ORDER[(idx + 1) % SCENE_STATUS_ORDER.length];
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, status: next } : s)));
    await supabaseRef.current.from("scenes").update({ status: next }).eq("id", sceneId);
  }

  /* ---- Scene reorder ---- */
  async function handleSceneDrop(chapterId: string) {
    if (!dragSceneId || !dragOverSceneId || dragSceneId === dragOverSceneId) {
      setDragSceneId(null);
      setDragOverSceneId(null);
      return;
    }

    const chapterScenes = scenes
      .filter((s) => s.chapter_id === chapterId)
      .sort((a, b) => a.position - b.position);

    const fromIdx = chapterScenes.findIndex((s) => s.id === dragSceneId);
    const toIdx = chapterScenes.findIndex((s) => s.id === dragOverSceneId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [item] = chapterScenes.splice(fromIdx, 1);
    chapterScenes.splice(toIdx, 0, item);
    const updated = chapterScenes.map((s, i) => ({ ...s, position: i }));

    setScenes((prev) => [
      ...prev.filter((s) => s.chapter_id !== chapterId),
      ...updated,
    ]);
    setDragSceneId(null);
    setDragOverSceneId(null);

    const supabase = supabaseRef.current;
    await Promise.all(
      updated.map((s) => supabase.from("scenes").update({ position: s.position }).eq("id", s.id))
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-[700px] mx-auto">
        {sorted.map((chapter) => {
          const isOpen = openChapters.has(chapter.id);
          const chapterScenes = scenes
            .filter((s) => s.chapter_id === chapter.id)
            .sort((a, b) => a.position - b.position);
          const dotColor = STATUS_DOT[chapter.status] ?? STATUS_DOT.a_ecrire;

          return (
            <div key={chapter.id} className="mb-3">
              {/* Chapter header */}
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-[var(--radius-md)] bg-bg-tertiary hover:bg-bg-hover transition-colors cursor-pointer border-none"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  className={`transition-transform duration-150 shrink-0 ${isOpen ? "" : "-rotate-90"}`}
                >
                  <path d="M2 3.5L5 6.5 8 3.5" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="text-[13px] font-medium text-text-primary flex-1">
                  {chapter.title}
                </span>
                <span className="text-[11px] text-text-quaternary">
                  {chapterScenes.length} scène{chapterScenes.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Chapter content */}
              {isOpen && (
                <div className="mt-1 ml-2 border-l-2 border-border pl-2 pb-2">
                  {/* Synopsis */}
                  <div className="mb-2">
                    <div className="text-[10px] font-medium text-text-quaternary uppercase tracking-wider px-3 mb-0.5">
                      Résumé
                    </div>
                    <EditableSynopsis
                      value={chapter.synopsis ?? ""}
                      onSave={(val) => saveSynopsis(chapter.id, val)}
                    />
                  </div>

                  {/* Scenes */}
                  <div className="mb-1">
                    <div className="text-[10px] font-medium text-text-quaternary uppercase tracking-wider px-3 mb-1">
                      Scènes
                    </div>

                    {chapterScenes.length === 0 ? (
                      <div className="ml-4 px-3 text-[12px] text-text-quaternary italic mb-1">
                        Aucune scène
                      </div>
                    ) : (
                      <div
                        onDrop={(e) => { e.preventDefault(); handleSceneDrop(chapter.id); }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {chapterScenes.map((scene) => (
                          <SceneRow
                            key={scene.id}
                            scene={scene}
                            onRename={(t) => renameScene(scene.id, t)}
                            onDelete={() => deleteScene(scene.id)}
                            onStatusCycle={() => cycleSceneStatus(scene.id)}
                            onDragStart={() => setDragSceneId(scene.id)}
                            onDragOver={() => setDragOverSceneId(scene.id)}
                            onDragEnd={() => { setDragSceneId(null); setDragOverSceneId(null); }}
                            isDragOver={dragOverSceneId === scene.id && dragSceneId !== scene.id}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => addScene(chapter.id)}
                      className="ml-4 mt-1 text-[11px] text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent transition-colors"
                    >
                      + Ajouter une scène
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
