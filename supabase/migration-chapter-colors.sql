-- Migration: couleurs lignes / cellules / colonnes du chapitrage
--
-- Persistance des couleurs choisies via les poignées hover :
--   - row_color    : tinte le fond d'une ligne entière
--   - cell_colors  : map { [colKey]: hex } pour les cases des colonnes par défaut
--   - column_colors: map { [colKey]: hex } stocké sur le roman (toutes lignes)
--   - planning_cell_values.color : couleur d'une cellule de colonne custom
--
-- Tout est nullable / default '{}'. Pas de check stricte (on accepte tout
-- code commençant par # — on validera côté client : 8 swatches préfixés).

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS row_color text,
  ADD COLUMN IF NOT EXISTS cell_colors jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS column_colors jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.planning_cell_values
  ADD COLUMN IF NOT EXISTS color text;
