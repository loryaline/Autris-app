"use client";

import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChapterData, SceneData } from "@/app/(app)/planning/[novelId]/planning-client";
import { RichEditableCell } from "./RichEditableCell";

/* ---- Types ---- */
type SceneItem = SceneData;
type ChapterItem = ChapterData;

type SceneStatus = "todo" | "in_progress" | "done";

const SCENE_STATUS: Record<SceneStatus, { label: string; tone: "teal" | "amber" | "peach" }> = {
  todo: { label: "À faire", tone: "peach" },
  in_progress: { label: "En cours", tone: "amber" },
  done: { label: "Fait", tone: "teal" },
};

const SCENE_STATUS_ORDER: SceneStatus[] = ["todo", "in_progress", "done"];

function summaryForScenes(scenes: SceneItem[]): { label: string; tone: "teal" | "amber" | "peach" | "slate" } {
  if (scenes.length === 0) return { label: "vide", tone: "slate" };
  const statuses = scenes.map((s) => s.status);
  if (statuses.every((s) => s === "done")) return { label: "tous faits", tone: "teal" };
  if (statuses.some((s) => s === "in_progress")) return { label: "en cours", tone: "amber" };
  if (statuses.every((s) => s === "todo")) return { label: "à faire", tone: "peach" };
  return { label: "en cours", tone: "amber" };
}

/* ---- Editable Synopsis (rich text, rendu blockquote) ---- */
function EditableSynopsis({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  return (
    <blockquote
      className="relative block border-l-2 rounded-r-[var(--radius-md)] outline-synopsis"
      style={{
        borderColor: "var(--color-accent-border)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <span
        className="absolute left-3 top-2 text-text-quaternary/60 font-serif text-[14px] not-italic select-none pointer-events-none"
        aria-hidden
      >
        «
      </span>
      <RichEditableCell
        value={value}
        onSave={onSave}
        placeholder="Décris l'arc du chapitre en quelques phrases…"
        className="outline-synopsis-cell text-text-secondary"
      />
      <span
        className="absolute right-3 bottom-2 text-text-quaternary/60 font-serif text-[14px] not-italic select-none pointer-events-none"
        aria-hidden
      >
        »
      </span>
    </blockquote>
  );
}

/* ---- Status pill (scene) ---- */
function SceneStatusPill({
  status,
  onClick,
}: {
  status: SceneStatus;
  onClick: () => void;
}) {
  const info = SCENE_STATUS[status];
  const toneStyle =
    info.tone === "teal"
      ? {
          background: "rgba(93,202,165,0.12)",
          border: "1px solid rgba(93,202,165,0.25)",
          color: "#8fd9c2",
        }
      : info.tone === "amber"
        ? {
            background: "rgba(228,180,140,0.1)",
            border: "1px solid rgba(228,180,140,0.25)",
            color: "#e4b48c",
          }
        : {
            background: "var(--color-accent-bg)",
            border: "1px solid var(--color-accent-border)",
            color: "var(--color-accent)",
          };
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] cursor-pointer shrink-0 transition-opacity hover:opacity-80"
      style={toneStyle}
    >
      {status === "done" && (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.5L4 7.5L8 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {info.label}
    </button>
  );
}

/* ---- Scene Row ---- */
function SceneRow({
  scene,
  autoEdit = false,
  onRename,
  onDelete,
  onStatusCycle,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver,
}: {
  scene: SceneItem;
  autoEdit?: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
  onStatusCycle: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  // Si autoEdit (scène fraîchement créée), on entre en édition direct
  // pour permettre de la nommer immédiatement sans double-click.
  const [editing, setEditing] = useState(autoEdit);
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

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-red-500/5 border border-red-500/20">
        <span className="text-[12px] text-red-300 flex-1 truncate">
          Supprimer « {scene.title} » ?
        </span>
        <button
          onClick={() => {
            setShowConfirm(false);
            onDelete();
          }}
          className="text-[11px] px-2 py-1 bg-red-500/80 text-white rounded cursor-pointer"
        >
          Supprimer
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="text-[11px] px-2 py-1 text-text-tertiary hover:text-text-primary cursor-pointer"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] bg-bg-primary/40 border border-white/[0.04] hover:border-white/[0.08] hover:bg-bg-primary/60 transition-colors ${
        isDragOver ? "border-t-2 border-t-[var(--color-accent)]" : ""
      }`}
      draggable={!editing}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver();
      }}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle (2x3 dots like mockup) */}
      <span
        className="text-text-quaternary/60 cursor-grab select-none leading-none shrink-0"
        aria-hidden
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2" cy="3" r="1" />
          <circle cx="8" cy="3" r="1" />
          <circle cx="2" cy="7" r="1" />
          <circle cx="8" cy="7" r="1" />
          <circle cx="2" cy="11" r="1" />
          <circle cx="8" cy="11" r="1" />
        </svg>
      </span>

      {/* Scene title */}
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditValue(scene.title);
              setEditing(false);
            }
          }}
          className="flex-1 px-1.5 py-0.5 text-[12.5px] border border-[var(--color-accent-border)] rounded bg-bg-primary text-text-primary outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => {
            setEditing(true);
            setEditValue(scene.title);
          }}
          className="flex-1 text-[12.5px] text-text-secondary cursor-text truncate"
          title="Double-cliquer pour renommer"
        >
          {scene.title}
        </span>
      )}

      <SceneStatusPill status={scene.status} onClick={onStatusCycle} />

      {/* Delete */}
      <button
        onClick={() => setShowConfirm(true)}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-[12px] text-text-quaternary hover:text-red-400 cursor-pointer shrink-0 transition-opacity"
        title="Supprimer la scène"
      >
        ✕
      </button>
    </div>
  );
}

/* ---- Chapter card title (splits "title · theme" style) ---- */
function ChapterCardHeader({
  chapter,
  scenesCount,
  summary,
}: {
  chapter: ChapterItem;
  scenesCount: number;
  summary: { label: string; tone: string };
}) {
  const themes = Array.isArray(chapter.themes) ? chapter.themes.filter(Boolean) : [];
  const title = (chapter.title || "Sans titre").trim();

  const summaryColor =
    summary.tone === "teal"
      ? "#8fd9c2"
      : summary.tone === "amber"
        ? "#e4b48c"
        : summary.tone === "peach"
          ? "var(--color-accent)"
          : "var(--text-quaternary, #737687)";

  return (
    <header className="flex items-baseline justify-between gap-4 mb-3">
      <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
        <h3 className="font-serif text-[22px] leading-tight text-text-primary">
          {title}
        </h3>
        {themes.length > 0 && (
          <>
            <span className="text-text-quaternary/50 text-[13px]">·</span>
            <span className="font-serif italic text-[15px] text-[var(--color-accent)]/95">
              {themes.join(" · ")}
            </span>
          </>
        )}
      </div>
      <div className="text-[11.5px] text-text-tertiary shrink-0 inline-flex items-center gap-1.5">
        <span>
          {scenesCount} scène{scenesCount > 1 ? "s" : ""}
        </span>
        <span className="text-text-quaternary/40">·</span>
        <span className="font-serif italic" style={{ color: summaryColor }}>
          {summary.label}
        </span>
      </div>
    </header>
  );
}

/* ---- Main OutlineView ---- */
export function OutlineView({
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
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  // ID de la scène fraîchement créée → autoEdit pour démarrer
  // directement en édition de titre.
  const [justCreatedSceneId, setJustCreatedSceneId] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const sorted = [...chapters].sort((a, b) => a.position - b.position);

  async function saveSynopsis(chapterId: string, synopsis: string) {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, synopsis: synopsis || null } : c))
    );
    await supabaseRef.current
      .from("chapters")
      .update({ synopsis: synopsis || null })
      .eq("id", chapterId);
  }

  async function addScene(chapterId: string) {
    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    if (data) {
      setScenes((prev) => [...prev, data as SceneItem]);
      setJustCreatedSceneId((data as SceneItem).id);
    }
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
      updated.map((s) =>
        supabase.from("scenes").update({ position: s.position }).eq("id", s.id)
      )
    );
  }

  return (
    <div className="flex-1 overflow-auto px-6 pt-8 pb-14">
      <div className="max-w-[1100px] mx-auto relative">
        {/* Timeline centrale */}
        {sorted.length > 0 && (
          <div
            className="absolute top-6 bottom-6 w-px left-1/2 -translate-x-px"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 6%, rgba(255,255,255,0.08) 94%, transparent 100%)",
            }}
            aria-hidden
          />
        )}

        {sorted.map((chapter, idx) => {
          const chapterScenes = scenes
            .filter((s) => s.chapter_id === chapter.id)
            .sort((a, b) => a.position - b.position);
          const summary = summaryForScenes(chapterScenes);
          const onRight = idx % 2 === 0;

          return (
            <div
              key={chapter.id}
              className="relative mb-8 last:mb-0 grid grid-cols-2 gap-8"
            >
              {/* Point de timeline, centré sur la ligne, aligné avec le haut de la carte */}
              <div
                className="absolute top-7 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full flex items-center justify-center z-[1]"
                style={{
                  background: "var(--color-accent-bg)",
                  border: "1px solid var(--color-accent-border)",
                }}
                aria-hidden
              >
                <span
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              </div>

              {/* Cellule vide + carte, selon la parité */}
              {onRight ? <div /> : null}
              <section
                className="rounded-[var(--radius-lg)] border border-white/[0.06] bg-bg-tertiary/30 p-5"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.35)",
                }}
              >
                <ChapterCardHeader
                  chapter={chapter}
                  scenesCount={chapterScenes.length}
                  summary={summary}
                />

                {/* Synopsis */}
                <div className="mb-5">
                  <EditableSynopsis
                    value={chapter.synopsis ?? ""}
                    onSave={(val) => saveSynopsis(chapter.id, val)}
                  />
                </div>

                {/* Scenes */}
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase mb-2.5"
                  style={{ letterSpacing: "0.18em" }}
                >
                  Scènes
                </div>

                {chapterScenes.length === 0 ? (
                  <div className="text-[12px] text-text-quaternary italic font-serif mb-2">
                    Aucune scène planifiée pour ce chapitre.
                  </div>
                ) : (
                  <div
                    className="flex flex-col gap-1.5"
                    onDrop={(e) => {
                      e.preventDefault();
                      handleSceneDrop(chapter.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {chapterScenes.map((scene) => (
                      <SceneRow
                        key={scene.id}
                        scene={scene}
                        autoEdit={scene.id === justCreatedSceneId}
                        onRename={(t) => {
                          renameScene(scene.id, t);
                          if (scene.id === justCreatedSceneId) {
                            setJustCreatedSceneId(null);
                          }
                        }}
                        onDelete={() => deleteScene(scene.id)}
                        onStatusCycle={() => cycleSceneStatus(scene.id)}
                        onDragStart={() => setDragSceneId(scene.id)}
                        onDragOver={() => setDragOverSceneId(scene.id)}
                        onDragEnd={() => {
                          setDragSceneId(null);
                          setDragOverSceneId(null);
                        }}
                        isDragOver={
                          dragOverSceneId === scene.id && dragSceneId !== scene.id
                        }
                      />
                    ))}
                  </div>
                )}

                <div className="mt-3 text-center">
                  <button
                    onClick={() => addScene(chapter.id)}
                    className="text-[11.5px] text-text-tertiary hover:text-[var(--color-accent)] cursor-pointer font-serif italic transition-colors"
                  >
                    + Ajouter une scène
                  </button>
                </div>
              </section>
              {!onRight ? <div /> : null}
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center py-12 text-text-quaternary italic font-serif">
            Aucun chapitre pour le moment. Ajoute-les depuis le Chapitrage.
          </div>
        )}
      </div>
    </div>
  );
}
