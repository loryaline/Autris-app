-- Migration: ajouter narrative_template à novels
-- Cinq presets V1 + 'libre' (par défaut, pas de structure imposée).
-- Cette colonne n'impose rien à l'éditeur : elle sert d'amorce pour la
-- planification (génération de chapitres-jalons) et d'indicateur d'aide.

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS narrative_template text NOT NULL DEFAULT 'libre'
    CHECK (narrative_template IN ('libre', '3actes', 'snowflake', 'savethecat', 'heros'));
