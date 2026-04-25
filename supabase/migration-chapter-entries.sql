-- Migration : lien chapitre ↔ fiches de World Building
-- Chaque ligne attache une fiche WB (`wb_entries`) à un chapitre (`chapters`).
-- Suppression en cascade : si la fiche ou le chapitre disparaît, le lien aussi.

CREATE TABLE IF NOT EXISTS public.chapter_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.wb_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, entry_id)
);

CREATE INDEX IF NOT EXISTS chapter_entries_chapter_id_idx
  ON public.chapter_entries (chapter_id);
CREATE INDEX IF NOT EXISTS chapter_entries_entry_id_idx
  ON public.chapter_entries (entry_id);
CREATE INDEX IF NOT EXISTS chapter_entries_user_id_idx
  ON public.chapter_entries (user_id);

ALTER TABLE public.chapter_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapter_entries_select_own" ON public.chapter_entries;
CREATE POLICY "chapter_entries_select_own"
  ON public.chapter_entries
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_entries_insert_own" ON public.chapter_entries;
CREATE POLICY "chapter_entries_insert_own"
  ON public.chapter_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_entries_delete_own" ON public.chapter_entries;
CREATE POLICY "chapter_entries_delete_own"
  ON public.chapter_entries
  FOR DELETE
  USING (auth.uid() = user_id);
