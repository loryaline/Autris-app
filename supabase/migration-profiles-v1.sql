-- Migration: 3 colonnes manquantes sur public.profiles (V1)
--
-- Contexte : le code applicatif lit/écrit déjà ces colonnes (pomo_duration
-- depuis l'onboarding, plan_expires_at via le hero d'essai), mais elles
-- n'existaient pas en base. On les ajoute, on backfille pour les profils
-- existants, et on aligne le trigger handle_new_user() pour les fixer
-- correctement à la création.

-- 1. pomo_duration : durée du Pomodoro en minutes (15 / 20 / 25 / 30 / 45 / 60)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pomo_duration smallint NOT NULL DEFAULT 25
    CHECK (pomo_duration BETWEEN 5 AND 120);

-- 2. trial_started_at : début de la période d'essai 3 mois
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now();

-- 3. plan_expires_at : fin de l'essai / fin de la période payée
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz NOT NULL
    DEFAULT (now() + interval '3 months');

-- Backfill explicite pour les profils créés avant cette migration
-- (au cas où NOT NULL refuse de poser les defaults sur des lignes existantes
-- selon la version de Postgres / la stratégie d'ajout)
UPDATE public.profiles
SET trial_started_at = COALESCE(trial_started_at, created_at, now()),
    plan_expires_at  = COALESCE(plan_expires_at, COALESCE(created_at, now()) + interval '3 months'),
    pomo_duration    = COALESCE(pomo_duration, 25)
WHERE trial_started_at IS NULL
   OR plan_expires_at  IS NULL
   OR pomo_duration    IS NULL;

-- Aligner le trigger handle_new_user pour fixer la fenêtre d'essai
-- à la création du compte (au lieu de dépendre du DEFAULT, qui peut
-- être surchargé selon la valeur insérée).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, trial_started_at, plan_expires_at, pomo_duration)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    now(),
    now() + interval '3 months',
    25
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
