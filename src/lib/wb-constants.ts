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
// Volontairement limité à Pays/Nation et Carte : les autres thématiques
// (faune, mœurs, traditions, climat…) ont leur propre catégorie dédiée.
export const UNIVERS_SUBTYPES = [
  { key: "pays", label: "Pays / Nation", icon: "🏛️", hasTemplate: true },
  { key: "geographie", label: "Carte", icon: "🗺️", hasTemplate: false },
] as const;

export type UniversSubtype = typeof UNIVERS_SUBTYPES[number]["key"];

// Sous-catégories Bestiaire
export const BESTIAIRE_SUBCATEGORIES = [
  { key: "marines", label: "Créatures marines" },
  { key: "terrestres", label: "Créatures terrestres" },
  { key: "volantes", label: "Créatures volantes" },
] as const;

// Sous-types Magie & Divinités
// 4 archétypes : les dieux du panthéon, leurs artefacts, les mages qui
// manipulent la magie, et le système qui la régit.
export const MAGIC_SUBTYPES = [
  { key: "dieu", label: "Dieu (panthéon)", icon: "🔱", hasTemplate: true },
  { key: "artefact_divin", label: "Artefact divin", icon: "🏺", hasTemplate: true },
  { key: "mage", label: "Mage", icon: "🧙", hasTemplate: true },
  { key: "systeme_magique", label: "Système magique", icon: "✨", hasTemplate: true },
] as const;

export type MagicSubtype = typeof MAGIC_SUBTYPES[number]["key"];

// Sous-types Système monétaire
// Deux archétypes : la monnaie elle-même, et le vocabulaire économique /
// commercial (termes, jargon de marché, unités de mesure…).
export const MONEY_SUBTYPES = [
  { key: "monnaie", label: "Monnaie", icon: "💰", hasTemplate: true },
  { key: "terme", label: "Terme / vocabulaire", icon: "📘", hasTemplate: true },
] as const;

export type MoneySubtype = typeof MONEY_SUBTYPES[number]["key"];

// Types de liens prédéfinis (Option C : liste + "autre")
// Regroupés par famille pour faciliter l'UI (optgroups dans le sélecteur).
export const LINK_TYPE_GROUPS: { label: string; types: readonly string[] }[] = [
  {
    label: "Social",
    types: ["ami", "ennemi", "allié", "rival", "mentor", "élève", "compagnon", "connaissance"],
  },
  {
    label: "Famille",
    types: [
      "père",
      "mère",
      "fils",
      "fille",
      "frère",
      "sœur",
      "demi-frère",
      "demi-sœur",
      "époux",
      "épouse",
      "cousin",
      "cousine",
      "oncle",
      "tante",
      "neveu",
      "nièce",
      "grand-père",
      "grand-mère",
      "beau-parent",
      "beau-fils",
      "belle-fille",
      "famille (autre)",
    ],
  },
  {
    label: "Lieu / Possession",
    types: ["habite", "originaire de", "possède", "appartient à", "créé par"],
  },
  {
    label: "Autre",
    types: ["autre"],
  },
];

export const LINK_TYPES = LINK_TYPE_GROUPS.flatMap((g) => g.types) as readonly string[];

// Statuts
export const WB_STATUSES: { key: WbStatus; label: string; color: string }[] = [
  { key: "brouillon", label: "Brouillon", color: "text-text-tertiary" },
  { key: "valide", label: "Validé", color: "text-[#1D9E75]" },
  { key: "archive", label: "Archivé", color: "text-text-quaternary" },
];
