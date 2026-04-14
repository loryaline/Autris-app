import type { Genre } from "@/types/database";

export type WbCategory =
  | "univers_monde"
  | "histoire_mythes"
  | "societe_culture"
  | "personnages"
  | "lexique_langage"
  | "codex_glossaire"
  | "moodboard"
  | "bestiaire"
  | "magie_divinites"
  | "systeme_monetaire"
  | "objets_legendaires"
  | "crimes_enquetes"
  | "organisations_secretes"
  | "lieux_maudits"
  | "entites_malefiques";

export type WbStatus = "brouillon" | "valide" | "archive";

export interface WbCategoryDef {
  key: WbCategory;
  label: string;
  group: string;
  icon: string;
  genres?: Genre[]; // si undefined → toujours visible
}

export const WB_CATEGORIES: WbCategoryDef[] = [
  // L'Univers
  { key: "univers_monde", label: "Univers & Monde", group: "L'Univers", icon: "🌍" },
  { key: "histoire_mythes", label: "Histoire & Mythes", group: "L'Univers", icon: "📜" },
  { key: "societe_culture", label: "Société & Culture", group: "L'Univers", icon: "🏛️" },

  // Le Vivant
  { key: "personnages", label: "Personnages", group: "Le Vivant", icon: "👤" },
  {
    key: "bestiaire",
    label: "Bestiaire",
    group: "Le Vivant",
    icon: "🐉",
    genres: ["fantasy", "sf", "horreur"],
  },
  { key: "lexique_langage", label: "Lexique & Langage", group: "Le Vivant", icon: "💬" },

  // Le Sacré
  {
    key: "magie_divinites",
    label: "Magie & Divinités",
    group: "Le Sacré",
    icon: "✨",
    genres: ["fantasy", "sf", "historique"],
  },
  {
    key: "systeme_monetaire",
    label: "Système monétaire",
    group: "Le Sacré",
    icon: "💰",
    genres: ["fantasy", "sf", "historique"],
  },
  {
    key: "objets_legendaires",
    label: "Objets légendaires",
    group: "Le Sacré",
    icon: "⚔️",
    genres: ["fantasy", "sf", "historique"],
  },

  // L'Obscur
  {
    key: "crimes_enquetes",
    label: "Crimes & Enquêtes",
    group: "L'Obscur",
    icon: "🔍",
    genres: ["thriller", "polar", "horreur"],
  },
  {
    key: "organisations_secretes",
    label: "Organisations secrètes",
    group: "L'Obscur",
    icon: "🕵️",
    genres: ["thriller", "polar", "horreur"],
  },

  // L'Interdit
  {
    key: "lieux_maudits",
    label: "Lieux maudits",
    group: "L'Interdit",
    icon: "🏚️",
    genres: ["horreur", "fantasy"],
  },
  {
    key: "entites_malefiques",
    label: "Entités maléfiques",
    group: "L'Interdit",
    icon: "👹",
    genres: ["horreur", "fantasy"],
  },

  // Annexes
  { key: "codex_glossaire", label: "Codex & Glossaire", group: "Annexes", icon: "📖" },
  { key: "moodboard", label: "MoodBoard", group: "Annexes", icon: "🎨" },
];

export function categoriesForGenre(genre: Genre): WbCategoryDef[] {
  return WB_CATEGORIES.filter((c) => !c.genres || c.genres.includes(genre));
}

export function getCategoryDef(key: string): WbCategoryDef | undefined {
  return WB_CATEGORIES.find((c) => c.key === key);
}

// Genres qui activent la vue "Tableau des mœurs"
export const MOEURS_TABLE_GENRES: Genre[] = ["fantasy", "sf", "horreur"];

// Sous-types pour Univers & Monde
export const UNIVERS_SUBTYPES = [
  { key: "pays", label: "Pays / Nation", icon: "🏛️", hasTemplate: true },
  { key: "geographie", label: "Géographie / Carte", icon: "🗺️", hasTemplate: false },
  { key: "faune_flore", label: "Faune / Flore", icon: "🌿", hasTemplate: false },
  { key: "moeurs", label: "Mœurs", icon: "🧬", hasTemplate: false },
  { key: "traditions", label: "Traditions & Rites", icon: "🔮", hasTemplate: false },
  { key: "saisons", label: "Saisons & Climat", icon: "🌦️", hasTemplate: false },
  { key: "phenomenes_magiques", label: "Phénomènes magiques", icon: "🕯️", hasTemplate: false },
] as const;

export type UniversSubtype = typeof UNIVERS_SUBTYPES[number]["key"];

// Sous-catégories Bestiaire
export const BESTIAIRE_SUBCATEGORIES = [
  { key: "marines", label: "Créatures marines" },
  { key: "terrestres", label: "Créatures terrestres" },
  { key: "volantes", label: "Créatures volantes" },
] as const;

// Types de liens prédéfinis (Option C : liste + "autre")
export const LINK_TYPES = [
  "ami",
  "ennemi",
  "famille",
  "allié",
  "rival",
  "connaissance",
  "habite",
  "possède",
  "appartient à",
  "créé par",
  "autre",
] as const;

// Statuts
export const WB_STATUSES: { key: WbStatus; label: string; color: string }[] = [
  { key: "brouillon", label: "Brouillon", color: "text-text-tertiary" },
  { key: "valide", label: "Validé", color: "text-[#1D9E75]" },
  { key: "archive", label: "Archivé", color: "text-text-quaternary" },
];
