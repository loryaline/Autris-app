-- ===== MIGRATION: Rédaction par chapitre =====
-- Exécuter dans Supabase > SQL Editor
-- ATTENTION: Supprime toutes les données existantes (repartir de zéro)

-- 1. Nettoyer les données existantes
DELETE FROM public.projects;

-- 2. Ajouter content et word_count aux chapitres
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS word_count integer NOT NULL DEFAULT 0;

-- 3. Changer les statuts des chapitres
ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_status_check;
ALTER TABLE public.chapters ALTER COLUMN status SET DEFAULT 'a_ecrire';
ALTER TABLE public.chapters ADD CONSTRAINT chapters_status_check
  CHECK (status IN ('a_ecrire', 'premier_jet', 'revision', 'reecriture', 'correction', 'termine'));

-- 4. Mettre à jour le trigger pour calculer depuis chapters au lieu de scenes
CREATE OR REPLACE FUNCTION public.update_novel_word_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.novels
  SET current_words = (
    SELECT COALESCE(SUM(c.word_count), 0)
    FROM public.chapters c
    WHERE c.novel_id = COALESCE(NEW.novel_id, OLD.novel_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.novel_id, OLD.novel_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 5. Supprimer l'ancien trigger sur scenes et créer le nouveau sur chapters
DROP TRIGGER IF EXISTS on_scene_word_count_change ON public.scenes;
DROP TRIGGER IF EXISTS on_chapter_word_count_change ON public.chapters;
CREATE TRIGGER on_chapter_word_count_change
  AFTER INSERT OR UPDATE OF word_count OR DELETE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_novel_word_count();
