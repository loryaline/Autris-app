-- ===== MIGRATION : Statut par roman =====
-- À exécuter dans Supabase > SQL Editor.
-- Réutilise les mêmes statuts que les chapitres pour cohérence d'UI.

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'a_ecrire';

-- Contrainte de valeurs autorisées (miroir de ChapterStatus + 'publie')
ALTER TABLE public.novels
  DROP CONSTRAINT IF EXISTS novels_status_check;

ALTER TABLE public.novels
  ADD CONSTRAINT novels_status_check
  CHECK (status IN (
    'a_ecrire',
    'premier_jet',
    'revision',
    'reecriture',
    'correction',
    'termine',
    'publie'
  ));
