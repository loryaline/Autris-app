-- ===== MIGRATION : Roman actif + objectifs journaliers =====
-- À exécuter dans Supabase > SQL Editor.

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS words_per_session integer,
  ADD COLUMN IF NOT EXISTS sessions_per_week integer;

-- Contrainte : un seul roman actif par utilisateur à la fois
CREATE UNIQUE INDEX IF NOT EXISTS novels_one_active_per_user
  ON public.novels (user_id) WHERE is_active = true;

-- Activer par défaut le roman le plus récemment mis à jour de chaque utilisateur
-- (pour que l'app ne soit pas vide pour les comptes existants)
WITH ranked AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM public.novels
)
UPDATE public.novels n
SET is_active = true
FROM ranked r
WHERE n.id = r.id
  AND r.rn = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.novels n2
    WHERE n2.user_id = r.user_id AND n2.is_active = true
  );
