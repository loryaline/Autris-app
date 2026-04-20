-- ===== MIGRATION : Image de couverture pour les projets =====
-- À exécuter dans Supabase > SQL Editor.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_image_url text;
