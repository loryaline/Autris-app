-- ============================================
-- Migration: Planning Beats (méthodes narratives)
-- ============================================
-- Couche « guide » de la planification : une méthode narrative
-- (3 actes, voyage du héros, save the cat, snowflake) génère une suite
-- de beats structurels. Ces beats vivent dans leur propre table — ils
-- ne touchent JAMAIS chapters/scenes. Un beat peut être rattaché à un
-- chapitre via chapter_id (simple lien, aucune fusion).
--
-- Changer de méthode = DELETE puis re-INSERT dans cette table
-- uniquement : le Chapitrage et l'Outline restent intacts.

CREATE TABLE IF NOT EXISTS public.planning_beats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Méthode à laquelle appartient ce beat (cohérent avec novels.narrative_template)
  method text NOT NULL,
  -- Clé stable du beat dans la définition de la méthode (ex. "catalyst")
  beat_key text NOT NULL,
  label text NOT NULL,
  description text,
  -- Regroupement optionnel (ex. "Acte I"). Null si non pertinent.
  act text,
  position integer NOT NULL DEFAULT 0,
  -- Rattachement non destructif à un chapitre. SET NULL si le chapitre est supprimé.
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  -- Beat traité / étape cochée (utilisé surtout par Snowflake)
  done boolean NOT NULL DEFAULT false,
  -- Contenu libre saisi par l'utilisateur (étapes Snowflake)
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own planning_beats"
  ON public.planning_beats FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planning_beats_novel
  ON public.planning_beats (novel_id, position);
