export type Genre =
  | "fantasy"
  | "sf"
  | "thriller"
  | "polar"
  | "horreur"
  | "romance"
  | "historique"
  | "contemporain";

export type EditorTheme =
  | "blanc"
  | "fantasy"
  | "horreur"
  | "sf"
  | "polar"
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

export type Plan = "free" | "pro_monthly" | "pro_annual";

export interface Profile {
  id: string;
  username: string | null;
  plan: Plan;
  onboarding_done: boolean;
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

export interface Novel {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  current_words: number;
  word_goal: number | null;
  ui_theme: EditorTheme;
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
  created_at: string;
  updated_at: string;
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
