export type Genre =
  | "fantasy"
  | "sf"
  | "thriller"
  | "polar"
  | "horreur"
  | "romance"
  | "historique"
  | "contemporain";

export type ItemStatus = "todo" | "in_progress" | "done";

export type ChapterStatus =
  | "a_ecrire"
  | "premier_jet"
  | "revision"
  | "reecriture"
  | "correction"
  | "termine";

export type NovelStatus =
  | "a_ecrire"
  | "premier_jet"
  | "revision"
  | "reecriture"
  | "correction"
  | "termine"
  | "publie";

export type Plan = "free" | "pro_monthly" | "pro_annual";

export type Persona = "debutant" | "intermediaire_plan" | "intermediaire_suivi" | "avance";

export interface Profile {
  id: string;
  username: string | null;
  plan: Plan;
  persona: Persona | null;
  onboarding_done: boolean;
  /** Durée Pomodoro en minutes (default 25). */
  pomo_duration: number;
  /** Début de la période d'essai 3 mois (timestamptz ISO). */
  trial_started_at: string;
  /** Fin de l'essai / fin de la période payée (timestamptz ISO). */
  plan_expires_at: string;
  /** Soft delete RGPD : null = compte actif, sinon date de demande. */
  deleted_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  genre: Genre;
  created_at: string;
  updated_at: string;
}

export type NarrativeTemplate =
  | "libre"
  | "3actes"
  | "snowflake"
  | "savethecat"
  | "heros";

export interface Novel {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  current_words: number;
  word_goal: number | null;
  narrative_template: NarrativeTemplate;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  novel_id: string;
  user_id: string;
  title: string;
  content: string;
  word_count: number;
  position: number;
  status: ChapterStatus;
  synopsis: string | null;
  /** @deprecated Utiliser `themes` (text[]). Conservé pour rétro-compat. */
  theme: string | null;
  themes: string[];
  plot_elements: string | null;
  minor_elements: string | null;
  observations: string | null;
  tension_indices: string | null;
  pivot: string | null;
  narrative_knot: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningColumn {
  id: string;
  novel_id: string;
  user_id: string;
  name: string;
  type: "text" | "select" | "number";
  position: number;
  options: { choices?: string[] } | null;
  created_at: string;
}

export interface PlanningCellValue {
  id: string;
  column_id: string;
  chapter_id: string;
  user_id: string;
  value: string | null;
  created_at: string;
}

export interface PlanningPostit {
  id: string;
  novel_id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  chapter_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningMilestone {
  id: string;
  novel_id: string;
  user_id: string;
  title: string;
  type: "plan" | "beta" | "salon" | "soumission" | "custom";
  target_date: string | null;
  status: "planned" | "in_progress" | "done";
  color: string | null;
  position: number;
  created_at: string;
}

export type WbStatus = "brouillon" | "valide" | "archive";

export interface WbEntry {
  id: string;
  project_id: string;
  /** Roman auquel est rattaché la fiche (null = commune à tout le projet). */
  novel_id: string | null;
  user_id: string;
  category: string;
  subcategory: string | null;
  title: string;
  subtitle: string | null;
  description: string;
  template_data: Record<string, unknown>;
  personal_notes: string;
  main_image_url: string | null;
  gallery: string[];
  tags: string[];
  /** Groupes sociaux (factions, familles, équipages…) — pattern identique aux tags. */
  groups: string[];
  status: WbStatus;
  created_at: string;
  updated_at: string;
}

export interface WbLink {
  id: string;
  from_entry_id: string;
  to_entry_id: string;
  link_type: string | null;
  user_id: string;
  created_at: string;
}

/* ---- Plateaux du World Building ---- */

/** Nature d'un nœud posé sur un plateau. */
export type WbNodeKind =
  /** Lié : référence une fiche du World Building. */
  | "fiche"
  /** Libres : n'existent que sur le plateau. */
  | "postit"
  | "texte"
  | "forme"
  | "image"
  | "cadre";

export interface WbBoard {
  id: string;
  project_id: string;
  /** null = plateau de tout le projet (cas par défaut). */
  novel_id: string | null;
  user_id: string;
  title: string;
  description: string;
  /** Plateau ouvert par défaut à l'arrivée sur le World Building. */
  is_main: boolean;
  viewport: { x: number; y: number; zoom: number };
  created_at: string;
  updated_at: string;
}

export interface WbBoardNode {
  id: string;
  board_id: string;
  user_id: string;
  kind: WbNodeKind;
  /** Renseigné si kind = "fiche". Non unique : une fiche peut être posée plusieurs fois. */
  entry_id: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotation: number;
  /** Contenu des nœuds libres — { html } pour un post-it. */
  content: Record<string, unknown>;
  /** Apparence — { color } pour un post-it. */
  style: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WbBoardEdge {
  id: string;
  board_id: string;
  user_id: string;
  from_node_id: string;
  to_node_id: string;
  /** Renseigné = lien typé : l'étiquette vient de wb_links, jamais d'ici. */
  wb_link_id: string | null;
  /** Étiquette des flèches libres uniquement. */
  label: string;
  /**
   * Point par lequel passe la flèche, exprimé RELATIVEMENT à ses deux
   * extrémités — sinon le tracé resterait planté sur place quand les
   * fiches se déplacent (notamment portées par un cadre).
   *   t : position le long de l'axe (0 = milieu, ±0.5 = extrémités)
   *   o : écart perpendiculaire, en pixels plateau
   * Tableau vide = flèche droite.
   */
  waypoints: { t: number; o: number }[];
  style: Record<string, unknown>;
  created_at: string;
}

export interface Scene {
  id: string;
  chapter_id: string;
  user_id: string;
  title: string;
  content: string;
  word_count: number;
  position: number;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Une idée, dans la boîte de réception.
 *
 * `project_id` est facultatif et ne cloisonne rien : la boîte se lit par
 * `user_id` seul, pour qu'une idée sans projet reste consultable de
 * partout. Le rattachement sert à s'y retrouver, pas à ranger.
 */
export interface Idea {
  id: string;
  user_id: string;
  project_id: string | null;
  body: string;
  /** Rangée sans être perdue : hors de la boîte, pas de l'univers. */
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
