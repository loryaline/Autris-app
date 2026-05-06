-- Migration : tracker la date d'activation et le mot-base d'un roman.
--
-- Avant : le dashboard agrégeait tous les mots du mois calendaire et les
-- comparait à un "objectif mensuel" basé sur les paramètres de rythme du
-- roman actif. Ça n'avait pas de sens dès qu'on activait un roman en
-- milieu de mois ou qu'on basculait entre romans.
--
-- Après : on mémorise au moment du toggle is_active = true :
--   - activated_at      : timestamptz du passage à actif
--   - activation_word_count : current_words du roman au moment du toggle
-- Les estimations (mots écrits, rythme, fin estimée, % progression) se
-- calculent désormais sur la période [activated_at, now()] et sur
-- (current_words - activation_word_count).

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_word_count integer NOT NULL DEFAULT 0;

-- Backfill : pour les romans déjà actifs sans date d'activation,
-- on prend created_at comme proxy raisonnable et on suppose que le
-- décompte démarre à 0 (perte d'historique précis acceptable, ça
-- ne casse rien et ça repart proprement à la prochaine bascule).
UPDATE public.novels
SET activated_at = created_at
WHERE is_active = true
  AND activated_at IS NULL;
