"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";

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

export function ContextPanel({
  wordCount,
  paragraphCount,
  chapterTitle,
  chapterStatus,
  chapterId,
  onStatusChange,
}: {
  wordCount: number;
  paragraphCount: number;
  chapterTitle: string;
  chapterStatus: string;
  chapterId: string | null;
  onStatusChange: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "scenes">("info");
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const supabaseRef = useRef(createClient());

  const readingTime = Math.max(1, Math.round(wordCount / 250));
  const speakingTime = Math.max(1, Math.round(wordCount / 150));
  const s = STATUS_CONFIG[chapterStatus] ?? STATUS_CONFIG.a_ecrire;

  // Fetch scenes + synopsis when tab opens or chapter changes
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

  async function cycleSceneStatus(sceneId: string) {
    const scene = scenes.find((sc) => sc.id === sceneId);
    if (!scene) return;
    const idx = SCENE_STATUS_ORDER.indexOf(scene.status);
    const next = SCENE_STATUS_ORDER[(idx + 1) % SCENE_STATUS_ORDER.length];
    setScenes((prev) => prev.map((sc) => (sc.id === sceneId ? { ...sc, status: next } : sc)));
    await supabaseRef.current.from("scenes").update({ status: next }).eq("id", sceneId);
  }

  return (
    <div className="h-full border-l border-border p-2.5 bg-bg-secondary overflow-y-auto">
      {/* Tabs */}
      <div className="flex gap-0.5 mb-2 border-b border-border pb-1.5">
        <button
          onClick={() => setActiveTab("info")}
          className={`text-[11px] px-1.5 py-0.5 rounded font-medium border cursor-pointer transition-colors ${
            activeTab === "info"
              ? "bg-primary-bg text-primary-dark border-primary-border"
              : "bg-transparent text-text-tertiary border-transparent hover:text-text-secondary"
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setActiveTab("scenes")}
          className={`text-[11px] px-1.5 py-0.5 rounded font-medium border cursor-pointer transition-colors ${
            activeTab === "scenes"
              ? "bg-primary-bg text-primary-dark border-primary-border"
              : "bg-transparent text-text-tertiary border-transparent hover:text-text-secondary"
          }`}
        >
          Scènes
        </button>
      </div>

      {activeTab === "info" ? (
        <>
          {/* Chapter info */}
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
      ) : (
        <>
          {/* Scenes tab */}
          {!chapterId ? (
            <div className="text-[12px] text-text-quaternary italic">
              Sélectionnez un chapitre
            </div>
          ) : loadingScenes ? (
            <div className="text-[12px] text-text-quaternary italic">
              Chargement…
            </div>
          ) : (
            <>
              {/* Synopsis */}
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
                  {scenes.map((scene) => {
                    const statusInfo = SCENE_STATUS[scene.status] ?? SCENE_STATUS.todo;

                    return (
                      <div
                        key={scene.id}
                        className="group flex items-center gap-1.5 px-1.5 py-1 rounded-[var(--radius-sm)] hover:bg-bg-hover/50 transition-colors"
                      >
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
    </div>
  );
}
