"use client";

const VIEWS = [
  { key: "tableau", label: "Chapitrage", icon: "▦" },
  { key: "outline", label: "Outline", icon: "☰" },
  { key: "postits", label: "Post-its", icon: "▪" },
  { key: "gantt", label: "Gantt", icon: "▬" },
] as const;

export type PlanningView = (typeof VIEWS)[number]["key"];

interface Milestone {
  id: string;
  title: string;
  type: string;
  status: string;
  color: string | null;
}

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  planned: "border-text-quaternary",
  in_progress: "border-amber bg-amber/20",
  done: "border-[#1D9E75] bg-[#1D9E75]/20",
};

export function PlanningSubSidebar({
  activeView,
  onViewChange,
  milestones,
}: {
  activeView: PlanningView;
  onViewChange: (view: PlanningView) => void;
  milestones: Milestone[];
}) {
  return (
    <div className="w-[140px] shrink-0 border-r border-border bg-bg-secondary p-3 flex flex-col h-full">
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
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
          Milestones
        </div>
        {milestones.length > 0 ? (
          <div className="flex flex-col gap-1">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 text-[12px] text-text-secondary`}
              >
                <span
                  className={`w-2 h-2 rounded-full border ${MILESTONE_STATUS_COLOR[m.status] ?? MILESTONE_STATUS_COLOR.planned}`}
                />
                {m.title}
              </div>
            ))}
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
