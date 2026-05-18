"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  NARRATIVE_METHOD_LIST,
  getNarrativeMethod,
} from "@/lib/narrative-methods";
import type { PlanningBeat } from "@/app/(app)/planning/[novelId]/planning-client";

interface ChapterLite {
  id: string;
  title: string;
  position: number;
}

/**
 * Bande « Structure narrative » affichée au-dessus du Chapitrage.
 *
 * Méthode « beats » → cartes-beats ordonnées, rattachables à un chapitre.
 * Méthode « process » (Snowflake) → checklist d'étapes de travail.
 * Le changement de méthode ne remplace QUE les beats : chapitres, colonnes,
 * cellules, scènes et outline restent intacts.
 */
export function StructureBand({
  novelId,
  method,
  beats,
  chapters,
  onBeatsChange,
  onMethodChange,
  layout = "band",
}: {
  novelId: string;
  method: string;
  beats: PlanningBeat[];
  chapters: ChapterLite[];
  onBeatsChange: (beats: PlanningBeat[]) => void;
  onMethodChange: (method: string) => void;
  /** "band" = bande horizontale au-dessus du tableau ; "panel" = colonne latérale. */
  layout?: "band" | "panel";
}) {
  const supabase = useRef(createClient()).current;
  const [collapsed, setCollapsed] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [switching, setSwitching] = useState(false);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const def = getNarrativeMethod(method);
  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);

  function chapterLabel(id: string | null): string | null {
    if (!id) return null;
    const idx = sortedChapters.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const c = sortedChapters[idx];
    return `Ch. ${idx + 1} · ${c.title || "Sans titre"}`;
  }

  /* ---- Mutations beats ---- */
  async function assignBeat(beatId: string, chapterId: string | null) {
    onBeatsChange(
      beats.map((b) => (b.id === beatId ? { ...b, chapter_id: chapterId } : b)),
    );
    await supabase
      .from("planning_beats")
      .update({ chapter_id: chapterId })
      .eq("id", beatId);
  }

  async function toggleDone(beatId: string) {
    const beat = beats.find((b) => b.id === beatId);
    if (!beat) return;
    const next = !beat.done;
    onBeatsChange(beats.map((b) => (b.id === beatId ? { ...b, done: next } : b)));
    await supabase.from("planning_beats").update({ done: next }).eq("id", beatId);
  }

  function saveNote(beatId: string, note: string) {
    onBeatsChange(beats.map((b) => (b.id === beatId ? { ...b, note } : b)));
    if (noteTimers.current[beatId]) clearTimeout(noteTimers.current[beatId]);
    noteTimers.current[beatId] = setTimeout(() => {
      supabase.from("planning_beats").update({ note }).eq("id", beatId);
    }, 700);
  }

  /* ---- Changement de méthode ---- */
  async function changeMethod(newMethod: string) {
    if (newMethod === method) {
      setShowMethodModal(false);
      return;
    }
    setSwitching(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSwitching(false);
      return;
    }

    // 1. Méthode sur le roman
    await supabase
      .from("novels")
      .update({ narrative_template: newMethod })
      .eq("id", novelId);

    // 2. On purge les beats de l'ancienne méthode (et eux seuls)
    await supabase.from("planning_beats").delete().eq("novel_id", novelId);

    // 3. On seede la nouvelle méthode
    const newDef = getNarrativeMethod(newMethod);
    let inserted: PlanningBeat[] = [];
    if (newDef.beats.length > 0) {
      const rows = newDef.beats.map((b, i) => ({
        novel_id: novelId,
        user_id: user.id,
        method: newDef.id,
        beat_key: b.key,
        label: b.label,
        description: b.description,
        act: b.act ?? null,
        position: i,
      }));
      const { data } = await supabase
        .from("planning_beats")
        .insert(rows)
        .select(
          "id, method, beat_key, label, description, act, position, chapter_id, done, note",
        );
      inserted = (data as PlanningBeat[] | null) ?? [];
    }

    onMethodChange(newMethod);
    onBeatsChange(inserted);
    setSwitching(false);
    setShowMethodModal(false);
  }

  /* ---- Rendu ---- */
  const isProcess = def.kind === "process";
  const total = beats.length;
  const completed = isProcess
    ? beats.filter((b) => b.done).length
    : beats.filter((b) => b.chapter_id).length;
  const completionLabel = isProcess
    ? `${completed}/${total} étapes`
    : `${completed}/${total} beats placés`;

  // Groupement par acte (méthodes « beats » uniquement)
  const acts: { act: string | null; items: PlanningBeat[] }[] = [];
  if (!isProcess) {
    for (const b of beats) {
      const last = acts[acts.length - 1];
      if (last && last.act === (b.act ?? null)) last.items.push(b);
      else acts.push({ act: b.act ?? null, items: [b] });
    }
  }

  const isPanel = layout === "panel";

  return (
    <div
      className={
        isPanel
          ? "w-[300px] shrink-0 border-r border-white/[0.05] bg-bg-secondary/40 overflow-y-auto"
          : "shrink-0 border-b border-white/[0.05] bg-bg-secondary/40"
      }
    >
      <div className={isPanel ? "px-4 py-3" : "px-6 py-2.5"}>
        {/* En-tête de la bande */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
            title={collapsed ? "Déplier" : "Replier"}
          >
            <span
              className="text-[10px] text-text-quaternary transition-transform"
              style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}
            >
              ▾
            </span>
            <span
              className="text-[10px] font-medium text-text-quaternary uppercase"
              style={{ letterSpacing: "0.18em" }}
            >
              Structure narrative
            </span>
          </button>

          {method !== "libre" && (
            <span className="text-[11px] text-text-tertiary font-serif italic">
              {def.label}
            </span>
          )}

          {method !== "libre" && total > 0 && (
            <span className="text-[10.5px] text-text-quaternary font-mono">
              {completionLabel}
            </span>
          )}

          <button
            onClick={() => setShowMethodModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-white/[0.08] text-[11px] text-text-tertiary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer transition-colors"
          >
            {method === "libre" ? "Choisir une méthode" : "Changer de méthode"}
          </button>
        </div>

        {/* Corps */}
        {!collapsed && (
          <div className="mt-2.5">
            {method === "libre" ? (
              <div className="text-[11.5px] text-text-quaternary italic py-1">
                Aucune méthode narrative. Choisissez un cadre (3 actes, voyage du
                héros…) pour guider votre planification.
              </div>
            ) : isProcess ? (
              /* ---- Snowflake : checklist d'étapes ---- */
              <div className="flex flex-col gap-1.5 max-w-[760px]">
                {beats.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.015]"
                  >
                    <button
                      onClick={() => toggleDone(b.id)}
                      title={b.done ? "Étape faite" : "Marquer comme faite"}
                      className={`mt-0.5 w-4 h-4 shrink-0 rounded-[4px] border flex items-center justify-center cursor-pointer transition-colors ${
                        b.done
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[#1a1410]"
                          : "border-white/25 hover:border-white/50"
                      }`}
                    >
                      {b.done && <span className="text-[10px] leading-none">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[12.5px] ${
                          b.done
                            ? "text-text-tertiary line-through"
                            : "text-text-primary"
                        }`}
                      >
                        {b.label}
                      </div>
                      {b.description && (
                        <div className="text-[11px] text-text-tertiary mt-0.5">
                          {b.description}
                        </div>
                      )}
                      <textarea
                        defaultValue={b.note ?? ""}
                        onChange={(e) => saveNote(b.id, e.target.value)}
                        placeholder="Vos notes pour cette étape…"
                        rows={2}
                        className="mt-1.5 w-full text-[11.5px] px-2 py-1.5 bg-bg-primary border border-white/[0.07] rounded-[var(--radius-sm)] text-text-secondary placeholder:text-text-quaternary focus:outline-none focus:border-[var(--color-accent-border)] resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ---- Méthodes « beats » : cartes ordonnées par acte ---- */
              <div className="flex gap-3 overflow-x-auto pb-1.5">
                {acts.map((group, gi) => (
                  <div key={gi} className="flex flex-col gap-1.5 shrink-0">
                    {group.act && (
                      <div
                        className="text-[9.5px] font-medium text-[var(--color-accent)] uppercase px-0.5"
                        style={{ letterSpacing: "0.16em" }}
                      >
                        {group.act}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {group.items.map((b) => {
                        const linked = chapterLabel(b.chapter_id);
                        return (
                          <div
                            key={b.id}
                            className={`relative w-[188px] shrink-0 p-2.5 rounded-[var(--radius-md)] border transition-colors ${
                              linked
                                ? "border-[var(--color-accent-border)] bg-[var(--color-accent-bg)]/40"
                                : "border-dashed border-white/[0.12] bg-white/[0.015]"
                            }`}
                          >
                            <div className="text-[12px] text-text-primary font-medium leading-tight">
                              {b.label}
                            </div>
                            {b.description && (
                              <div className="text-[10.5px] text-text-tertiary mt-1 leading-snug">
                                {b.description}
                              </div>
                            )}

                            {/* Rattachement — select natif : jamais masqué
                                par le tableau (rendu hors flux du navigateur). */}
                            <div className="mt-2">
                              <select
                                value={b.chapter_id ?? ""}
                                onChange={(e) =>
                                  assignBeat(b.id, e.target.value || null)
                                }
                                className={`w-full text-[10.5px] px-1.5 py-1 rounded-[var(--radius-sm)] bg-bg-primary border cursor-pointer focus:outline-none ${
                                  linked
                                    ? "border-[var(--color-accent-border)] text-[var(--color-accent)]"
                                    : "border-white/[0.12] text-text-tertiary"
                                }`}
                              >
                                <option value="">— Rattacher à un chapitre —</option>
                                {sortedChapters.map((c, i) => (
                                  <option key={c.id} value={c.id}>
                                    Ch. {i + 1} · {c.title || "Sans titre"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de changement de méthode */}
      {showMethodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !switching && setShowMethodModal(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[460px] rounded-[var(--radius-xl)] border border-white/[0.08] bg-bg-tertiary p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[16px] text-text-primary mb-1">
              Méthode <span className="font-serif italic text-[var(--color-accent)]">narrative</span>
            </h2>
            <p className="text-[12px] text-text-tertiary mb-4">
              Choisissez un cadre pour guider votre planification.
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {NARRATIVE_METHOD_LIST.map((m) => {
                const active = m.id === method;
                return (
                  <button
                    key={m.id}
                    disabled={switching}
                    onClick={() => changeMethod(m.id)}
                    className={`flex items-center gap-3 text-left px-3.5 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors disabled:opacity-50 ${
                      active
                        ? "bg-[var(--color-accent-bg)] border-[var(--color-accent-border)]"
                        : "bg-bg-secondary border-white/[0.07] hover:bg-bg-hover"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                        active
                          ? "border-[var(--color-accent)]"
                          : "border-white/25"
                      }`}
                    >
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`text-[13px] ${
                          active ? "text-[var(--color-accent)] font-medium" : "text-text-primary"
                        }`}
                      >
                        {m.label}
                      </span>
                      <span className="block text-[11px] text-text-tertiary">
                        {m.id === "libre"
                          ? "Aucune structure imposée."
                          : m.kind === "process"
                            ? `${m.beats.length} étapes de travail`
                            : `${m.beats.length} beats narratifs`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[var(--radius-md)] bg-white/[0.03] border border-white/[0.06] p-3 text-[11.5px] leading-relaxed">
              <div className="text-text-secondary">
                ⚠ Les beats de structure seront remplacés.
              </div>
              <div className="text-text-tertiary mt-0.5">
                ✓ Vos chapitres, colonnes, cellules, résumés, scènes et l&apos;outline
                restent intacts.
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowMethodModal(false)}
                disabled={switching}
                className="h-9 px-4 rounded-[var(--radius-md)] text-[13px] text-text-secondary hover:bg-bg-hover cursor-pointer disabled:opacity-50"
              >
                {switching ? "Application…" : "Fermer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
