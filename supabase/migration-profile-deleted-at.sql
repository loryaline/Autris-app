-- Migration : soft delete des comptes (RGPD)
--
-- Quand l'utilisateur demande la suppression :
--   1. On marque profiles.deleted_at = now()
--   2. On signOut côté client
--   3. Une edge function / cron supprimera physiquement le compte auth.users
--      après 30 jours (purge définitive). En attendant, le user peut écrire
--      à autris pour annuler la suppression.
--
-- Le marqueur sert aussi à bloquer la connexion : le middleware vérifie
-- profile.deleted_at IS NULL avant d'accorder l'accès.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index partiel : la quasi-totalité des profils auront deleted_at NULL,
-- donc l'index ne couvre que les profils en attente de purge.
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;
