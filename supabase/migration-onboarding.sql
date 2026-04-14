-- Migration: Onboarding complet
-- Ajouter le champ persona à profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS persona text
  CHECK (persona IN ('debutant', 'intermediaire_plan', 'intermediaire_suivi', 'avance'));
