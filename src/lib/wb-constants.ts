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
      // « parent » / « enfant » plutôt que père/mère/fils/fille : la
      // filiation ne change pas selon le genre de qui la porte. Celui-ci
      // appartient au personnage, sa fiche le dit déjà.
      "parent",
      "enfant",
      // « adelphe » plutôt que frère/sœur : la fratrie est une relation
      // mutuelle, donc affichée avec une pointe à chaque bout — et un
      // mot genré y devient illisible (« sœur » avec deux pointes : la
      // sœur de qui ?). « adelphe » ne genre ni l'un ni l'autre. Le
      // genre appartient au personnage, pas au lien.
      "adelphe",
      "demi-adelphe",
      // Deux unions distinctes, toutes deux neutres : « mariés » dit
      // l'acte, « conjoint » dit la vie commune sans le mariage.
      "mariés",
      "conjoint",
      // Pas de parenté indirecte ici — ni cousin, ni oncle/tante, ni
      // neveu/nièce, ni grand-parent, ni belle-famille. Toutes passent
      // par une tierce personne et se déduisent des liens ci-dessus ;
      // et toutes obligeraient à choisir entre deux mots genrés là où
      // la relation, elle, n'a pas de genre. Pour les cas qui ne se
      // déduisent pas, « famille (autre) » reste ouvert.
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

/**
 * Types de lien qui expriment LE MÊME FAIT vu de l'autre côté.
 *
 * « Alina est la sœur de Set » et « Set est le frère d'Alina » ne sont
 * pas deux relations : c'est une seule, énoncée de chaque bord. Sans
 * cette table, on créerait des doublons et le plateau afficherait deux
 * flèches pour une seule fraternité.
 */
/** Toute la fratrie se répond, ancien vocabulaire genré compris. */
const SIBLING_TYPES = [
  "adelphe",
  "demi-adelphe",
  "frère",
  "sœur",
  "demi-frère",
  "demi-sœur",
] as const;

/** L'union par le mariage, ancien vocabulaire genré compris. */
const MARRIED_TYPES = ["mariés", "époux", "épouse"] as const;

/** Les deux bords de la filiation, ancien vocabulaire genré compris. */
const PARENT_TYPES = ["parent", "père", "mère"] as const;
const CHILD_TYPES = ["enfant", "fils", "fille"] as const;

/** Le cousinage, retiré de la saisie mais encore lisible. */
const COUSIN_TYPES = ["cousinage", "cousin", "cousine"] as const;

/**
 * Mots retirés du sélecteur — parenté indirecte et formes genrées — mais
 * toujours reconnus : ils peuplent les univers écrits avant ce ménage.
 * Les oublier ferait perdre leur réciprocité à ces liens (donc des
 * doublons) et les exclurait du dépliage généalogique.
 */
const LEGACY_FAMILY_TYPES = [
  ...PARENT_TYPES,
  ...CHILD_TYPES,
  ...SIBLING_TYPES,
  ...MARRIED_TYPES,
  ...COUSIN_TYPES,
  "oncle",
  "tante",
  "neveu",
  "nièce",
  "grand-père",
  "grand-mère",
  "beau-parent",
  "beau-fils",
  "belle-fille",
] as const;

const RECIPROCAL_TYPES: Record<string, readonly string[]> = {
  // Symétriques : le même mot des deux côtés
  ami: ["ami"],
  ennemi: ["ennemi"],
  allié: ["allié"],
  rival: ["rival"],
  compagnon: ["compagnon"],
  connaissance: ["connaissance"],
  autre: ["autre"],
  "famille (autre)": ["famille (autre)"],

  // Asymétriques
  mentor: ["élève"],
  élève: ["mentor"],

  // Filiation. Les formes genrées restent lues, plus proposées.
  parent: CHILD_TYPES,
  père: CHILD_TYPES,
  mère: CHILD_TYPES,
  enfant: PARENT_TYPES,
  fils: PARENT_TYPES,
  fille: PARENT_TYPES,

  // Fratrie. Les quatre mots genrés restent listés ici — plus proposés à
  // la saisie, mais présents dans les univers écrits avant « adelphe » :
  // sans eux ces liens perdraient leur réciprocité et se dédoubleraient.
  adelphe: SIBLING_TYPES,
  "demi-adelphe": SIBLING_TYPES,
  frère: SIBLING_TYPES,
  sœur: SIBLING_TYPES,
  "demi-frère": SIBLING_TYPES,
  "demi-sœur": SIBLING_TYPES,

  // Union. « conjoint » reste à part : ne pas marier d'office ceux que
  // l'autrice a seulement mis ensemble.
  mariés: MARRIED_TYPES,
  époux: MARRIED_TYPES,
  épouse: MARRIED_TYPES,
  conjoint: ["conjoint"],

  // Parenté indirecte : retirée de la saisie, conservée en lecture.
  cousinage: COUSIN_TYPES,
  cousin: COUSIN_TYPES,
  cousine: COUSIN_TYPES,

  oncle: ["neveu", "nièce"],
  tante: ["neveu", "nièce"],
  neveu: ["oncle", "tante"],
  nièce: ["oncle", "tante"],

  "grand-père": CHILD_TYPES,
  "grand-mère": CHILD_TYPES,

  "beau-parent": ["beau-fils", "belle-fille"],
  "beau-fils": ["beau-parent"],
  "belle-fille": ["beau-parent"],

  possède: ["appartient à"],
  "appartient à": ["possède"],
};

/**
 * Décalage de génération porté par un type de lien : de combien le
 * SUJET est-il au-dessus de l'OBJET ?
 *
 * « A est le parent de B » → +1 (A au-dessus de B). Sert à disposer un
 * arbre généalogique : les aînés en haut, la descendance en bas, la
 * fratrie au même niveau.
 */
const GENERATION_GAP: Record<string, number> = {
  "grand-père": 2,
  "grand-mère": 2,
  parent: 1,
  père: 1,
  mère: 1,
  oncle: 1,
  tante: 1,
  "beau-parent": 1,
  mentor: 1,
  enfant: -1,
  fils: -1,
  fille: -1,
  neveu: -1,
  nièce: -1,
  "beau-fils": -1,
  "belle-fille": -1,
  élève: -1,
};

/** Types qui décrivent une parenté (pour « déplier la famille »). */
const FAMILY_TYPES = new Set([
  ...(LINK_TYPE_GROUPS.find((g) => g.label === "Famille")?.types ?? []),
  ...LEGACY_FAMILY_TYPES,
]);

export function isFamilyType(type: string | null): boolean {
  return !!type && FAMILY_TYPES.has(type.trim().toLowerCase());
}

/**
 * Les types inventés par l'autrice, relevés dans ses liens existants.
 *
 * « amoureux », « suzerain », « dette de sang » : la liste fournie ne
 * peut pas tout prévoir, et un type saisi une fois doit se reproposer
 * ensuite — sinon on le ressaisit à chaque flèche, avec les fautes de
 * frappe qui vont avec, et un même fait finit sous trois orthographes.
 *
 * Le vocabulaire retiré du sélecteur (formes genrées, parenté indirecte)
 * est exclu : on le lit encore, on ne le propose plus.
 */
export function customLinkTypes(
  links: readonly { link_type: string | null }[],
): string[] {
  const known = new Set<string>([
    ...LINK_TYPES.map((t) => t.toLowerCase()),
    ...LEGACY_FAMILY_TYPES.map((t) => t.toLowerCase()),
  ]);
  const seen = new Map<string, string>();
  for (const l of links) {
    const t = l.link_type?.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (known.has(k) || seen.has(k)) continue;
    seen.set(k, t);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

/** De combien de générations le sujet est-il au-dessus de l'objet ? */
export function generationGap(type: string | null): number {
  if (!type) return 0;
  return GENERATION_GAP[type.trim().toLowerCase()] ?? 0;
}

/**
 * Deux types énoncent-ils le même fait, chacun de son côté ?
 * (« sœur » ↔ « frère », « père » ↔ « fils », « ami » ↔ « ami »…)
 */
export function areReciprocal(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();

  // Un même mot des deux côtés n'est réciproque QUE si le type est connu
  // comme symétrique. Surtout pas par défaut : « amoureux » est un type
  // saisi à la main, et l'amour n'est pas toujours partagé — présumer la
  // symétrie inventerait un sentiment que l'autrice n'a pas écrit.
  if (na === nb) return (RECIPROCAL_TYPES[na] ?? []).includes(na);
  return (RECIPROCAL_TYPES[na] ?? []).includes(nb);
}

// Statuts
export const WB_STATUSES: { key: WbStatus; label: string; color: string }[] = [
  { key: "brouillon", label: "Brouillon", color: "text-text-tertiary" },
  { key: "valide", label: "Validé", color: "text-[#1D9E75]" },
  { key: "archive", label: "Archivé", color: "text-text-quaternary" },
];
