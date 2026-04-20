import type { NovelStatus } from "@/types/database";

export const NOVEL_STATUS_ORDER: NovelStatus[] = [
  "a_ecrire",
  "premier_jet",
  "revision",
  "reecriture",
  "correction",
  "termine",
  "publie",
];

export const NOVEL_STATUS_LABELS: Record<NovelStatus, { label: string; color: string }> = {
  a_ecrire:    { label: "À écrire",     color: "bg-bg-hover text-text-tertiary" },
  premier_jet: { label: "Premier jet",  color: "bg-[#888780]/15 text-[#888780]" },
  revision:    { label: "Révision",     color: "bg-amber/15 text-amber" },
  reecriture:  { label: "Réécriture",   color: "bg-primary/15 text-primary" },
  correction:  { label: "Correction",   color: "bg-teal/15 text-teal" },
  termine:     { label: "Terminé",      color: "bg-[#1D9E75]/15 text-[#1D9E75]" },
  publie:      { label: "Publié",       color: "bg-blue/15 text-blue" },
};

export function nextNovelStatus(current: NovelStatus): NovelStatus {
  const i = NOVEL_STATUS_ORDER.indexOf(current);
  return NOVEL_STATUS_ORDER[(i + 1) % NOVEL_STATUS_ORDER.length];
}
