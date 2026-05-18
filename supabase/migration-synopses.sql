-- Migration: table synopses (multi-synopsis par roman)
-- Remplace l'approche colonne unique novels.synopsis : un roman peut
-- avoir plusieurs synopsis (ex. « la page » courte + « le synopsis »
-- détaillé de la méthode Snowflake). Édités depuis l'onglet Synopsis
-- de la planification, en sous-onglets.
--
-- Note : la colonne novels.synopsis (migration-novel-synopsis.sql)
-- devient inutilisée — laissée en place, sans donnée réelle.

CREATE TABLE IF NOT EXISTS public.synopses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Synopsis',
  content text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.synopses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own synopses"
  ON public.synopses FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_synopses_novel
  ON public.synopses (novel_id, position);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.synopses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
