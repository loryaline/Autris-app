"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<string, { variant: "teal" | "amber" | "muted" | "primary"; label: string }> = {
  a_ecrire: { variant: "muted", label: "À écrire" },
  premier_jet: { variant: "muted", label: "Premier jet" },
  revision: { variant: "amber", label: "Révision" },
  reecriture: { variant: "primary", label: "Réécriture" },
  correction: { variant: "teal", label: "Correction" },
  termine: { variant: "teal", label: "Terminé" },
};

export function ContextPanel({
  wordCount,
  paragraphCount,
  chapterTitle,
  chapterStatus,
  onStatusChange,
}: {
  wordCount: number;
  paragraphCount: number;
  chapterTitle: string;
  chapterStatus: string;
  onStatusChange: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "scenes">("info");

  const readingTime = Math.max(1, Math.round(wordCount / 250));
  const speakingTime = Math.max(1, Math.round(wordCount / 150));

  const s = STATUS_CONFIG[chapterStatus] ?? STATUS_CONFIG.a_ecrire;

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
          {/* Scenes tab — placeholder for planning post-its */}
          <div className="text-[12px] text-text-quaternary italic">
            Les scènes de planification arriveront bientôt.
          </div>
        </>
      )}
    </div>
  );
}
