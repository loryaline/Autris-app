-- Migration: persistance des largeurs de colonnes du chapitrage
--
-- Stocke un map { [colKey]: pixels } sur le roman, à l'image de
-- column_order et column_colors déjà présents. Les colonnes non
-- listées tombent sur leur largeur par défaut côté client.

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS column_widths jsonb NOT NULL DEFAULT '{}'::jsonb;
