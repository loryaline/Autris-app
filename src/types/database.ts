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
