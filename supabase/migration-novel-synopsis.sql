-- Migration: novels.synopsis
-- Document de synopsis du roman (HTML TipTap), édité depuis l'onglet
-- « Synopsis » de la planification. Sert notamment aux étapes « La page »
-- et « Le synopsis » de la méthode Snowflake.

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS synopsis text NOT NULL DEFAULT '';
