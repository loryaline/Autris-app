-- Migration : groupes sociaux pour les fiches WB (notamment les personnages).
-- Stocké sous forme d'array de libellés (pattern identique aux tags).
-- Permet de regrouper les personnages par appartenance (faction, famille élargie,
-- guilde, équipage, etc.) et de trier/filtrer par groupe dans la liste.

ALTER TABLE public.wb_entries
  ADD COLUMN IF NOT EXISTS groups text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS wb_entries_groups_gin_idx
  ON public.wb_entries USING gin (groups);
