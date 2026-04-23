/**
 * Palettes de teintes pour les bandeaux, halos et badges de fiches WB.
 * Usage purement esthétique (refonte graphique).
 */

export type WbTone = {
  bg: string;
  border: string;
  text: string;
  glow: string;
};

export const WB_TONE_PALETTE: Record<string, WbTone> = {
  teal: {
    bg: "rgba(45,94,90,0.55)",
    border: "rgba(93,202,165,0.25)",
    text: "#8fd9c2",
    glow: "rgba(93,202,165,0.18)",
  },
  purple: {
    bg: "rgba(60,42,78,0.6)",
    border: "rgba(180,140,220,0.25)",
    text: "#c9a9e3",
    glow: "rgba(170,130,220,0.18)",
  },
  amber: {
    bg: "rgba(68,46,28,0.6)",
    border: "rgba(228,180,140,0.25)",
    text: "#e4b48c",
    glow: "rgba(228,180,140,0.18)",
  },
  blue: {
    bg: "rgba(34,52,82,0.6)",
    border: "rgba(140,170,220,0.25)",
    text: "#a6c1e6",
    glow: "rgba(130,170,220,0.18)",
  },
  violet: {
    bg: "rgba(58,37,69,0.6)",
    border: "rgba(200,150,230,0.25)",
    text: "#d4b3e7",
    glow: "rgba(200,150,230,0.18)",
  },
  rose: {
    bg: "rgba(70,38,52,0.6)",
    border: "rgba(220,150,180,0.25)",
    text: "#e5b0c2",
    glow: "rgba(220,150,180,0.18)",
  },
  green: {
    bg: "rgba(40,62,48,0.6)",
    border: "rgba(130,200,150,0.25)",
    text: "#9cd6af",
    glow: "rgba(130,200,150,0.18)",
  },
  red: {
    bg: "rgba(72,36,38,0.6)",
    border: "rgba(220,130,130,0.25)",
    text: "#e3a4a4",
    glow: "rgba(220,130,130,0.18)",
  },
  slate: {
    bg: "rgba(40,44,58,0.6)",
    border: "rgba(255,255,255,0.08)",
    text: "#b8bccc",
    glow: "rgba(255,255,255,0.05)",
  },
};

export function toneFor(category: string, subcategory?: string | null): WbTone {
  const sub = subcategory ?? "";
  if (category === "univers_monde") {
    if (sub === "pays") return WB_TONE_PALETTE.purple;
    if (sub === "geographie") return WB_TONE_PALETTE.teal;
    if (sub === "faune_flore") return WB_TONE_PALETTE.green;
    if (sub === "moeurs") return WB_TONE_PALETTE.rose;
    if (sub === "traditions") return WB_TONE_PALETTE.amber;
    if (sub === "saisons") return WB_TONE_PALETTE.blue;
    if (sub === "phenomenes_magiques") return WB_TONE_PALETTE.violet;
    return WB_TONE_PALETTE.teal;
  }
  if (category === "personnages") return WB_TONE_PALETTE.amber;
  if (category === "bestiaire") return WB_TONE_PALETTE.blue;
  if (category === "magie_divinites") return WB_TONE_PALETTE.violet;
  if (category === "objets_legendaires") return WB_TONE_PALETTE.amber;
  if (category === "systeme_monetaire") return WB_TONE_PALETTE.amber;
  if (category === "lieux_maudits") return WB_TONE_PALETTE.rose;
  if (category === "entites_malefiques") return WB_TONE_PALETTE.red;
  if (category === "histoire_mythes") return WB_TONE_PALETTE.amber;
  if (category === "societe_culture") return WB_TONE_PALETTE.amber;
  if (category === "lexique_langage") return WB_TONE_PALETTE.teal;
  if (category === "codex_glossaire") return WB_TONE_PALETTE.slate;
  return WB_TONE_PALETTE.slate;
}
