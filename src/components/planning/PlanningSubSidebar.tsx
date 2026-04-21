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

const STATUS_DOT: Record<string, string> = {
  planned: "border-text-quaternary",
  in_progress: "border-amber bg-amber/40",
  done: "border-[#1D9E75] bg-[#1D9E75]/40",
};

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
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
    const maxPos = milestones.reduce((m, x) => Math.max(m, (x as { position?: number }).position ?? 0), 0);
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
    if (!title) { setEditingId(null); return; }
    await supabase.from("planning_milestones").update({
      title,
      type: editType,
      target_date: editDate || null,
    }).eq("id", id);
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
    <div className="w-[160px] shrink-0 border-r border-border bg-bg-secondary p-3 flex flex-col h-full">
      {/* View switcher */}
      <div className="flex flex-col gap-0.5 mb-4">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => onViewChange(v.key)}
            className={`flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer transition-colors text-left ${
              activeView === v.key
                ? "bg-primary-bg text-primary-dark font-medium"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <span className="text-[11px] w-3 text-center">{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* Milestones */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
            Milestones
          </div>
          <button
            onClick={() => setAdding((a) => !a)}
            className="text-[14px] text-text-tertiary hover:text-primary cursor-pointer leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-bg-hover"
            title="Ajouter un milestone"
          >
            {adding ? "×" : "+"}
          </button>
        </div>

        {adding && (
          <div className="flex flex-col gap-1 mb-2 p-2 bg-bg-primary rounded border border-border">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addMilestone(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Titre"
              className="w-full px-1.5 py-1 text-[12px] bg-bg-secondary border border-border rounded focus:outline-none focus:border-primary"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as MilestoneType)}
              className="w-full px-1 py-1 text-[11px] bg-bg-secondary border border-border rounded cursor-pointer"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-1 py-1 text-[11px] bg-bg-secondary border border-border rounded"
            />
            <button
              onClick={addMilestone}
              disabled={!newTitle.trim()}
              className="text-[11px] px-2 py-1 bg-primary text-white rounded cursor-pointer hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter
            </button>
          </div>
        )}

        {milestones.length > 0 ? (
          <div className="flex flex-col gap-1">
            {milestones.map((m) =>
              editingId === m.id ? (
                <div key={m.id} className="flex flex-col gap-1 p-2 bg-bg-primary rounded border border-border">
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(m.id); if (e.key === "Escape") setEditingId(null); }}
                    className="w-full px-1.5 py-1 text-[12px] bg-bg-secondary border border-border rounded focus:outline-none focus:border-primary"
                  />
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as MilestoneType)}
                    className="w-full px-1 py-1 text-[11px] bg-bg-secondary border border-border rounded cursor-pointer"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-1 py-1 text-[11px] bg-bg-secondary border border-border rounded"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(m.id)}
                      className="flex-1 text-[11px] px-1.5 py-1 bg-primary text-white rounded cursor-pointer hover:bg-primary-dark"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => deleteMilestone(m.id)}
                      className="text-[11px] px-1.5 py-1 bg-red-500/10 text-red-500 rounded cursor-pointer hover:bg-red-500/20"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={m.id}
                  className="group flex items-center gap-1.5 text-[12px] text-text-secondary hover:bg-bg-hover rounded px-1 py-0.5"
                >
                  <button
                    onClick={() => toggleStatus(m)}
                    className={`w-2.5 h-2.5 rounded-full border shrink-0 cursor-pointer ${STATUS_DOT[m.status] ?? STATUS_DOT.planned}`}
                    title={`Statut : ${m.status}`}
                  />
                  <button
                    onClick={() => startEdit(m)}
                    className="flex-1 text-left truncate cursor-pointer hover:text-text-primary"
                    title={`${m.title}${m.target_date ? ` — ${fmtDate(m.target_date)}` : ""}`}
                  >
                    {m.title}
                    {m.target_date && (
                      <span className="text-text-quaternary text-[10px] ml-1">{fmtDate(m.target_date)}</span>
                    )}
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="text-[11px] text-text-quaternary italic">
            Aucun milestone
          </div>
        )}
      </div>
    </div>
  );
}
