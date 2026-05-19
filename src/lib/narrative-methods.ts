/**
 * Définition des méthodes narratives proposées dans la planification.
 *
 * Une méthode « beats » est une suite d'étapes structurelles du récit,
 * rattachables à des chapitres. Une méthode « process » (Snowflake) est
 * une suite d'étapes de travail, cochables, avec une zone de note.
 *
 * Ces définitions servent à seeder la table `planning_beats`. Elles ne
 * touchent jamais les chapitres ni les scènes.
 */

export type NarrativeMethodId =
  | "libre"
  | "3actes"
  | "heros"
  | "savethecat"
  | "snowflake";

/**
 * Action proposée pour une étape (méthode « process »).
 * - "note" : zone de texte libre (par défaut).
 * - "wb" : bouton vers le World Building du projet.
 * - "view" : bouton vers une vue de la planification.
 */
export type BeatAction =
  | { type: "note" }
  | { type: "wb"; label: string }
  | { type: "view"; view: "tableau" | "outline" | "synopsis"; label: string };

export interface BeatDef {
  key: string;
  label: string;
  description: string;
  /** Regroupement optionnel (ex. « Acte I »). */
  act?: string;
  /** Action de l'étape (méthodes « process » uniquement). Défaut : note. */
  action?: BeatAction;
}

export interface NarrativeMethodDef {
  id: NarrativeMethodId;
  label: string;
  /** "beats" = étapes du récit rattachables aux chapitres ; "process" = étapes de travail. */
  kind: "beats" | "process";
  beats: BeatDef[];
}

const TROIS_ACTES: BeatDef[] = [
  { key: "ouverture", act: "Acte I", label: "Ouverture", description: "Le monde et le quotidien du héros, avant la rupture." },
  { key: "incident", act: "Acte I", label: "Incident déclencheur", description: "L'événement qui met l'histoire en marche." },
  { key: "pivot1", act: "Acte I", label: "Premier pivot", description: "Le héros s'engage : le retour en arrière devient impossible." },
  { key: "obstacles", act: "Acte II", label: "Obstacles & enjeux", description: "Les complications montent, les enjeux se précisent." },
  { key: "midpoint", act: "Acte II", label: "Point médian", description: "Bascule majeure : révélation ou renversement de situation." },
  { key: "crise", act: "Acte II", label: "Crise", description: "Tout semble perdu, le héros est au plus bas." },
  { key: "pivot2", act: "Acte III", label: "Second pivot", description: "Le dernier élan vers la confrontation finale." },
  { key: "climax", act: "Acte III", label: "Climax", description: "L'affrontement décisif." },
  { key: "resolution", act: "Acte III", label: "Résolution", description: "Les conséquences et le nouvel équilibre." },
];

const VOYAGE_HEROS: BeatDef[] = [
  { key: "monde_ordinaire", label: "Le monde ordinaire", description: "Le quotidien du héros avant l'aventure." },
  { key: "appel", label: "L'appel à l'aventure", description: "Un événement bouscule l'équilibre." },
  { key: "refus", label: "Le refus de l'appel", description: "Le héros hésite, doute, recule." },
  { key: "mentor", label: "La rencontre du mentor", description: "Une figure le guide et l'arme pour la suite." },
  { key: "seuil", label: "Le passage du seuil", description: "Le héros s'engage pour de bon dans l'inconnu." },
  { key: "epreuves", label: "Épreuves, alliés et ennemis", description: "Il apprend les règles du nouveau monde." },
  { key: "approche", label: "L'approche de la caverne", description: "Préparation avant l'épreuve centrale." },
  { key: "epreuve_supreme", label: "L'épreuve suprême", description: "Confrontation au danger le plus grand." },
  { key: "recompense", label: "La récompense", description: "Le héros saisit ce qu'il était venu chercher." },
  { key: "retour", label: "Le chemin du retour", description: "Les conséquences le poursuivent." },
  { key: "resurrection", label: "La résurrection", description: "Ultime épreuve : la transformation finale." },
  { key: "elixir", label: "Le retour avec l'élixir", description: "Le héros revient changé, porteur d'un don." },
];

const SAVE_THE_CAT: BeatDef[] = [
  { key: "opening_image", label: "Opening Image", description: "L'image d'ouverture : ton et univers du roman." },
  { key: "theme_stated", label: "Theme Stated", description: "Le thème du roman est énoncé, souvent en passant." },
  { key: "setup", label: "Set-Up", description: "Présentation du héros, de son monde et de ses manques." },
  { key: "catalyst", label: "Catalyst", description: "L'événement déclencheur qui rompt le quotidien." },
  { key: "debate", label: "Debate", description: "Le héros hésite face au changement." },
  { key: "break_two", label: "Break into Two", description: "Le héros choisit d'agir : entrée dans l'acte 2." },
  { key: "b_story", label: "B Story", description: "L'intrigue secondaire, souvent relationnelle." },
  { key: "fun_games", label: "Fun and Games", description: "La promesse du pitch : le cœur du récit." },
  { key: "midpoint", label: "Midpoint", description: "Fausse victoire ou fausse défaite : les enjeux montent." },
  { key: "bad_guys", label: "Bad Guys Close In", description: "La pression et les antagonistes resserrent l'étau." },
  { key: "all_lost", label: "All Is Lost", description: "Le point le plus bas de l'histoire." },
  { key: "dark_night", label: "Dark Night of the Soul", description: "Le héros au fond du gouffre, avant le sursaut." },
  { key: "break_three", label: "Break into Three", description: "La solution émerge : entrée dans l'acte 3." },
  { key: "finale", label: "Finale", description: "Le héros applique sa leçon et résout l'intrigue." },
  { key: "final_image", label: "Final Image", description: "L'image de clôture, miroir de l'ouverture." },
];

const SNOWFLAKE: BeatDef[] = [
  { key: "phrase", label: "1 · La phrase", description: "Résumez le roman en une seule phrase (≈ 15 mots).", action: { type: "note" } },
  { key: "paragraphe", label: "2 · Le paragraphe", description: "Étendez la phrase en un paragraphe : mise en place, trois crises, dénouement.", action: { type: "note" } },
  { key: "personnages", label: "3 · Les personnages", description: "Créez une fiche-résumé pour chaque personnage principal dans l'univers.", action: { type: "wb", label: "Créer une fiche personnage" } },
  { key: "page", label: "4 · La page", description: "Développez chaque phrase du paragraphe en un paragraphe complet, dans le synopsis.", action: { type: "view", view: "synopsis", label: "Ouvrir le synopsis" } },
  { key: "fiches_perso", label: "5 · Les fiches détaillées", description: "Approfondissez chaque personnage : histoire, motivations, arc.", action: { type: "wb", label: "Ouvrir l'univers" } },
  { key: "synopsis", label: "6 · Le synopsis", description: "Étendez la page en un synopsis de plusieurs pages.", action: { type: "view", view: "synopsis", label: "Ouvrir le synopsis" } },
  { key: "scenes", label: "7 · La liste des chapitres", description: "Posez la liste de vos chapitres dans le tableau de chapitrage.", action: { type: "view", view: "tableau", label: "Ouvrir le chapitrage" } },
  { key: "plan_scenes", label: "8 · Le plan des scènes", description: "Détaillez chaque scène, chapitre par chapitre, dans la vue Scènes.", action: { type: "view", view: "outline", label: "Ouvrir les scènes" } },
];

export const NARRATIVE_METHODS: Record<NarrativeMethodId, NarrativeMethodDef> = {
  libre: { id: "libre", label: "Libre", kind: "beats", beats: [] },
  "3actes": { id: "3actes", label: "Trois actes", kind: "beats", beats: TROIS_ACTES },
  heros: { id: "heros", label: "Voyage du héros", kind: "beats", beats: VOYAGE_HEROS },
  savethecat: { id: "savethecat", label: "Save the Cat", kind: "beats", beats: SAVE_THE_CAT },
  snowflake: { id: "snowflake", label: "Flocon (Snowflake)", kind: "process", beats: SNOWFLAKE },
};

/** Liste ordonnée pour les sélecteurs d'UI. */
export const NARRATIVE_METHOD_LIST: NarrativeMethodDef[] = [
  NARRATIVE_METHODS.libre,
  NARRATIVE_METHODS["3actes"],
  NARRATIVE_METHODS.heros,
  NARRATIVE_METHODS.savethecat,
  NARRATIVE_METHODS.snowflake,
];

export function getNarrativeMethod(id: string | null | undefined): NarrativeMethodDef {
  if (id && id in NARRATIVE_METHODS) {
    return NARRATIVE_METHODS[id as NarrativeMethodId];
  }
  return NARRATIVE_METHODS.libre;
}
