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

      {/* L'état de l'enregistrement.

          L'en-tête l'annonce déjà en toutes lettres : le répéter ici
          revenait à dire « sauvegardé » deux fois au même instant, en haut
          et en bas du même écran. Quand tout va bien, la pastille seule
          suffit — c'est un signal d'ambiance, pas une nouvelle. Dès que
          quelque chose cloche, le mot revient : une sauvegarde en cours,
          une perte de réseau ou une erreur méritent d'être nommées. */}
      <div
        className="flex items-center gap-1.5 px-2.5 ml-auto"
        title={status.label}
        aria-label={status.label}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
        {syncStatus !== "saved" && (
          <span className="text-text-tertiary">{status.label}</span>
        )}
      </div>
    </div>
  );
}
