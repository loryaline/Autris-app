"use client";

type SyncStatus = "saved" | "saving" | "offline" | "error";

const statusConfig: Record<SyncStatus, { color: string; label: string }> = {
  saved: { color: "bg-teal-dark", label: "sauvegardé" },
  saving: { color: "bg-primary", label: "sauvegarde…" },
  offline: { color: "bg-red", label: "hors-ligne" },
  error: { color: "bg-red", label: "erreur" },
};

export function StatusBar({
  wordCount,
  wordGoal,
  syncStatus,
}: {
  wordCount: number;
  wordGoal?: number | null;
  syncStatus: SyncStatus;
}) {
  const status = statusConfig[syncStatus];

  return (
    <div className="h-[26px] bg-bg-secondary border-t border-border flex items-center overflow-hidden text-[12px]">
      {/* Word count */}
      <div className="flex items-center gap-1 px-2.5 border-r border-border text-text-secondary">
        <span>{wordCount.toLocaleString("fr-FR")}</span>
        {wordGoal && (
          <span className="text-text-tertiary">
            / {wordGoal.toLocaleString("fr-FR")}
          </span>
        )}
      </div>

      {/* Sync status */}
      <div className="flex items-center gap-1.5 px-2.5 ml-auto">
        <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
        <span className="text-text-tertiary">{status.label}</span>
      </div>
    </div>
  );
}
