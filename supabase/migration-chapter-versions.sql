-- ===== MIGRATION : Historique des versions de chapitres =====
-- Snapshots du contenu d'un chapitre (auto ou manuel).
-- À exécuter dans Supabase > SQL Editor.

CREATE TABLE IF NOT EXISTS public.chapter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  label text,                       -- "Auto" / "Manuelle" / libre
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chapter_versions_chapter_idx
  ON public.chapter_versions(chapter_id, created_at DESC);

-- RLS
ALTER TABLE public.chapter_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapter_versions_select_own" ON public.chapter_versions;
CREATE POLICY "chapter_versions_select_own"
  ON public.chapter_versions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_versions_insert_own" ON public.chapter_versions;
CREATE POLICY "chapter_versions_insert_own"
  ON public.chapter_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_versions_delete_own" ON public.chapter_versions;
CREATE POLICY "chapter_versions_delete_own"
  ON public.chapter_versions FOR DELETE
  USING (auth.uid() = user_id);
