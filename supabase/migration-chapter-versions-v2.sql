-- ===== MIGRATION v2 : numéro de version + nom personnalisé =====
-- À exécuter dans Supabase > SQL Editor.

ALTER TABLE public.chapter_versions
  ADD COLUMN IF NOT EXISTS version text;

ALTER TABLE public.chapter_versions
  ADD COLUMN IF NOT EXISTS name text;

-- Index pour récupérer rapidement la dernière version d'un chapitre
-- (déjà couvert par chapter_versions_chapter_idx, rien à faire)
