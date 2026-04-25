-- Migration : chapters.theme (text) → chapters.themes (text[])
-- L'ancienne colonne `theme` reste en place (non utilisée côté app) pour
-- éviter toute régression ; elle pourra être supprimée dans une migration
-- ultérieure après validation.

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS themes text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill : si l'ancienne colonne `theme` contient du texte non vide (après
-- strip des balises HTML basiques), on l'injecte comme premier (et unique)
-- élément de `themes`.
UPDATE public.chapters
SET themes = ARRAY[ btrim(regexp_replace(theme, '<[^>]*>', '', 'g')) ]
WHERE themes = '{}'::text[]
  AND theme IS NOT NULL
  AND btrim(regexp_replace(theme, '<[^>]*>', '', 'g')) <> '';
