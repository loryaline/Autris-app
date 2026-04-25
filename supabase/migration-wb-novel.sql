-- Migration : attribution d'une fiche WB à un roman spécifique du projet.
-- NULL = fiche commune à tous les romans du projet (comportement actuel).
-- Valeur = fiche rattachée à un roman précis.

ALTER TABLE public.wb_entries
  ADD COLUMN IF NOT EXISTS novel_id uuid
  REFERENCES public.novels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wb_entries_novel_id_idx
  ON public.wb_entries (novel_id);
