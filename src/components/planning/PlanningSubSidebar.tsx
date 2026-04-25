"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const VIEWS = [
  { key: "tableau", label: "Chapitrage", icon: "▦" },
  { key: "outline", label: "Outline", icon: "☰" },
  { key: "postits", label: "Post-its", icon: "▪" },
  { key: "gantt", label: "Gantt", icon: "▬" },
] as const;

export type PlanningView = (typeof VIEWS)[number]["key"];

type MilestoneType = "plan" | "beta" | "salon" | "soumission" | "custom";
type MilestoneStatus = "planned" | "in_progress" | "done";

interface Milestone {
  id: string;
  title: string;
  type: string;
  status: string;
  color: string | null;
  target_date?: string | null;
}

const TYPES: { value: MilestoneType; label: string; emoji: string }[] = [
  { value: "plan", label: "Plan", emoji: "▦" },
  { value: "beta", label: "Bêta", emoji: "◐" },
  { value: "salon", label: "Salon", emoji: "✦" },
  { value: "soumission", label: "Soumission", emoji: "✉" },
  { value: "custom", label: "Autre", emoji: "◆" },
];

const NEXT_STATUS: Record<MilestoneStatus, MilestoneStatus> = {
  planned: "in_progress",
  in_progress: "done",
  done: "planned",
};

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PlanningSubSidebar({
  activeView,
  onViewChange,
  milestones,
  novelId,
}: {
  activeView: PlanningView;
  onViewChange: (view: PlanningView) => void;
  milestones: Milestone[];
  novelId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<MilestoneType>("plan");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<MilestoneType>("plan");

  async function addMilestone() {
    const title = newTitle.trim();
    if (!title) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const maxPos = milestones.reduce(
      (m, x) => Math.max(m, (x as { position?: number }).position ?? 0),
      0
    );
    await supabase.from("planning_milestones").insert({
      novel_id: novelId,
      user_id: user.id,
      title,
      type: newType,
      target_date: newDate || null,
      status: "planned",
      position: maxPos + 1,
    });
    setNewTitle("");
    setNewDate("");
    setNewType("plan");
    setAdding(false);
    router.refresh();
  }

  async function toggleStatus(m: Milestone) {
    const next = NEXT_STATUS[(m.status as MilestoneStatus) ?? "planned"];
    await supabase.from("planning_milestones").update({ status: next }).eq("id", m.id);
    router.refresh();
  }

  async function saveEdit(id: string) {
    const title = editTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    await supabase
      .from("planning_milestones")
      .update({
        title,
        type: editType,
        target_date: editDate || null,
      })
      .eq("id", id);
    setEditingId(null);
    router.refresh();
  }

  async function deleteMilestone(id: string) {
    if (!confirm("Supprimer ce milestone ?")) return;
    await supabase.from("planning_milestones").delete().eq("id", id);
    router.refresh();
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditType((m.type as MilestoneType) ?? "custom");
    setEditDate(m.target_date ?? "");
  }

  return (
    <div className="w-[220px] shrink-0 border-r border-white/[0.05] bg-bg-secondary flex flex-col h-full overflow-y-auto">
      {/* Section title */}
      <div className="px-4 pt-5 pb-2">
        <div
          className="text-[10px] font-medium text-text-quaternary uppercase"
          style={{ letterSpacing: "0.18em" }}
        >
          Planification
        </div>
      </div>

      {/* View switcher */}
      <div className="px-2 flex flex-col gap-0.5">
        {VIEWS.map((v) => {
          const active = activeView === v.key;
          return (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              className={`group relative flex items-center gap-2.5 h-9 px-2.5 rounded-[var(--radius-md)] cursor-pointer transition-colors text-left ${
                active
                  ? "bg-white/[0.035] text-text-primary"
                  : "text-text-secondary hover:bg-white/[0.02] hover:text-text-primary"
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[12px] ${
                  active
                    ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                    : "bg-white/[0.03] text-text-tertiary"
                }`}
                aria-hidden
              >
                {v.icon}
              </span>
              <span className="text-[13px]">{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Milestones */}
      <div className="mt-6 px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div
            className="text-[10px] font-medium text-text-quaternary uppercase"
            style={{ letterSpacing: "0.18em" }}
          >
            Milestones
          </div>
          <button
            onClick={() => setAdding((a) => !a)}
            className="text-[14px] text-text-quaternary hover:text-[var(--color-accent)] cursor-pointer leading-none w-5 h-5 flex items-center justify-center rounded transition-colors"
            title="Ajouter un milestone"
          >
            {adding ? "×" : "+"}
          </button>
        </div>

        {adding && (
          <div className="flex flex-col gap-1.5 mb-2 p-2.5 bg-bg-tertiary/60 rounded-[var(--radius-md)] border border-white/[0.06]">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addMilestone();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Titre"
              className="w-full px-2 py-1.5 text-[12px] bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-accent-border)] text-text-primary placeholder:text-text-quaternary"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as MilestoneType)}
              className="w-full px-1.5 py-1 text-[11.5px] bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-sm)] cursor-pointer text-text-secondary"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-1.5 py-1 text-[11.5px] bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-sm)] text-text-secondary"
            />
            <button
              onClick={addMilestone}
              disabled={!newTitle.trim()}
              className="text-[11.5px] px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                background: "var(--color-accent)",
                color: "#1a1410",
              }}
            >
              Ajouter
            </button>
          </div>
        )}

        {milestones.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {milestones.map((m) =>
              editingId === m.id ? (
                <div
                  key={m.id}
                  className="flex flex-col gap-1.5 p-2.5 bg-bg-tertiary/60 rounded-[var(--radius-md)] border border-white/[0.06]"
                >
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(m.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full px-2 py-1.5 text-[12px] bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--color-accent-border)] text-text-primary"
                  />
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as MilestoneType)}
                    className="w-full px-1.5 py-1 text-[11.5px] bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-sm)] cursor-pointer text-text-secondary"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-1.5 py-1 text-[11.5px] bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-sm)] text-text-secondary"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => saveEdit(m.id)}
                      className="flex-1 text-[11.5px] px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors"
                      style={{
                        background: "var(--color-accent)",
                        color: "#1a1410",
                      }}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => deleteMilestone(m.id)}
                      className="text-[11.5px] px-2 py-1.5 bg-red-500/10 text-red-400 rounded-[var(--radius-sm)] cursor-pointer hover:bg-red-500/20"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={m.id}
                  onClick={() => startEdit(m)}
                  className="group relative text-left p-2.5 rounded-[var(--radius-md)] border border-dashed border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.12] transition-colors cursor-pointer"
                >
                  {m.target_date && (
                    <div
                      className="text-[9.5px] font-medium text-text-quaternary uppercase mb-0.5"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      {fmtDate(m.target_date)}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(m);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          toggleStatus(m);
                        }
                      }}
                      className={`w-1.5 h-1.5 rounded-full shrink-0 cursor-pointer ${
                        m.status === "done"
                          ? "bg-teal"
                          : m.status === "in_progress"
                            ? "bg-amber"
                            : "bg-white/30"
                      }`}
                      title={`Statut : ${m.status}`}
                    />
                    <span className="text-[12.5px] text-text-primary truncate">
                      {m.title}
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          !adding && (
            <div className="text-[11px] text-text-quaternary italic font-serif">
              Aucun jalon pour l&apos;instant.
            </div>
          )
        )}
      </div>
    </div>
  );
}
