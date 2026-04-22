-- ===== MIGRATION : user_stats + daily_activity + colonnes profiles/projects/novels =====
-- À exécuter dans Supabase > SQL Editor.
-- Idempotente — peut être relancée.

-- ---------------------------------------------------------------------------
-- 1. Colonnes manquantes sur profiles / projects / novels
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pomo_duration int2 NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS autarie_skin text,
  ADD COLUMN IF NOT EXISTS autarie_companion text,
  ADD COLUMN IF NOT EXISTS autarie_showcase text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS wb_categories jsonb;

-- (narrative_template retiré — feature pas implémentée côté app)

-- tempo retiré du chapitrage (jamais exposé dans DEFAULT_COLUMNS)
ALTER TABLE public.chapters DROP COLUMN IF EXISTS tempo;

-- ---------------------------------------------------------------------------
-- 2. Table user_stats — XP, streak, totaux
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  xp int4 NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'scribouillard',
  streak_current int2 NOT NULL DEFAULT 0,
  streak_longest int2 NOT NULL DEFAULT 0,
  streak_freezes int2 NOT NULL DEFAULT 0,
  last_streak_date date,
  total_editor_seconds int8 NOT NULL DEFAULT 0,
  total_pomodoro_sessions int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_stats_select ON public.user_stats;
CREATE POLICY user_stats_select ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_stats_modify ON public.user_stats;
CREATE POLICY user_stats_modify ON public.user_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Table daily_activity — calendrier GitHub multi-couleurs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date date NOT NULL,
  words_written int4 NOT NULL DEFAULT 0,   -- violet
  wb_activity bool NOT NULL DEFAULT false, -- teal (on/off)
  wb_count int4 NOT NULL DEFAULT 0,        -- nb de fiches touchées
  plan_activity bool NOT NULL DEFAULT false, -- ambre (on/off)
  plan_count int4 NOT NULL DEFAULT 0,      -- nb d'éléments planif touchés
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_activity_user_date_idx
  ON public.daily_activity(user_id, date DESC);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_activity_select ON public.daily_activity;
CREATE POLICY daily_activity_select ON public.daily_activity
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_activity_modify ON public.daily_activity;
CREATE POLICY daily_activity_modify ON public.daily_activity
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Trigger : création automatique de user_stats à l'inscription
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_user_stats ON public.profiles;
CREATE TRIGGER trigger_create_user_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_user_stats();

-- ---------------------------------------------------------------------------
-- 5. Trigger daily_activity — RÉDACTION (sur chapters.word_count, LIVE)
-- ---------------------------------------------------------------------------
-- On s'appuie sur les autosaves (UPDATE de chapters) plutôt que sur les
-- snapshots chapter_versions, qui ne se produisent qu'en changement de
-- chapitre / snapshot manuel / changement de statut. Chaque delta positif
-- de word_count est ajouté à daily_activity du jour courant.

CREATE OR REPLACE FUNCTION public.fn_daily_writing_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta int4;
  v_is_active bool;
BEGIN
  IF NEW.word_count IS NULL THEN RETURN NEW; END IF;

  -- On ne comptabilise QUE l'écriture du roman actif (sinon les imports
  -- de romans inactifs polluent la projection quotidienne).
  SELECT COALESCE(n.is_active, false) INTO v_is_active
  FROM public.novels n
  WHERE n.id = NEW.novel_id;
  IF NOT v_is_active THEN RETURN NEW; END IF;

  -- Delta NET : on autorise les valeurs négatives (suppressions) pour que la
  -- somme mensuelle corresponde à la croissance nette du roman. L'affichage
  -- clampe à 0 côté UI pour ne pas montrer de jour "négatif".
  delta := NEW.word_count - COALESCE(OLD.word_count, 0);
  IF delta <> 0 THEN
    INSERT INTO public.daily_activity (user_id, date, words_written)
    VALUES (NEW.user_id, now()::date, delta)
    ON CONFLICT (user_id, date) DO UPDATE
      SET words_written = public.daily_activity.words_written + EXCLUDED.words_written,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Retire l'ancien trigger sur chapter_versions (on double-comptait avec le nouveau)
DROP TRIGGER IF EXISTS trigger_daily_redaction ON public.chapter_versions;

DROP TRIGGER IF EXISTS trigger_daily_writing_chapter_upd ON public.chapters;
CREATE TRIGGER trigger_daily_writing_chapter_upd
  AFTER UPDATE ON public.chapters
  FOR EACH ROW
  WHEN (NEW.word_count IS DISTINCT FROM OLD.word_count)
  EXECUTE FUNCTION public.fn_daily_writing_chapter();

-- ---------------------------------------------------------------------------
-- 6. Trigger daily_activity — WORLD BUILDING (wb_entries)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_daily_wb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, date, wb_activity, wb_count)
  VALUES (NEW.user_id, COALESCE(NEW.updated_at, now())::date, true, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET wb_activity = true,
        wb_count = public.daily_activity.wb_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_daily_wb_ins ON public.wb_entries;
CREATE TRIGGER trigger_daily_wb_ins
  AFTER INSERT ON public.wb_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_daily_wb();

DROP TRIGGER IF EXISTS trigger_daily_wb_upd ON public.wb_entries;
CREATE TRIGGER trigger_daily_wb_upd
  AFTER UPDATE ON public.wb_entries
  FOR EACH ROW
  WHEN (NEW.updated_at IS DISTINCT FROM OLD.updated_at)
  EXECUTE FUNCTION public.fn_daily_wb();

-- ---------------------------------------------------------------------------
-- 7. Triggers daily_activity — PLANIFICATION (postits + milestones)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_daily_plan_postit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, date, plan_activity, plan_count)
  VALUES (NEW.user_id, COALESCE(NEW.updated_at, now())::date, true, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET plan_activity = true,
        plan_count = public.daily_activity.plan_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_daily_postit_ins ON public.planning_postits;
CREATE TRIGGER trigger_daily_postit_ins AFTER INSERT ON public.planning_postits
  FOR EACH ROW EXECUTE FUNCTION public.fn_daily_plan_postit();

DROP TRIGGER IF EXISTS trigger_daily_postit_upd ON public.planning_postits;
CREATE TRIGGER trigger_daily_postit_upd AFTER UPDATE ON public.planning_postits
  FOR EACH ROW
  WHEN (NEW.updated_at IS DISTINCT FROM OLD.updated_at)
  EXECUTE FUNCTION public.fn_daily_plan_postit();

CREATE OR REPLACE FUNCTION public.fn_daily_plan_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, date, plan_activity, plan_count)
  VALUES (NEW.user_id, COALESCE(NEW.created_at, now())::date, true, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET plan_activity = true,
        plan_count = public.daily_activity.plan_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_daily_milestone_ins ON public.planning_milestones;
CREATE TRIGGER trigger_daily_milestone_ins AFTER INSERT ON public.planning_milestones
  FOR EACH ROW EXECUTE FUNCTION public.fn_daily_plan_milestone();

-- ---------------------------------------------------------------------------
-- 7 bis. Triggers daily_activity — CHAPITRAGE & OUTLINE
-- Toute modification de chapitre/scène qui ne change PAS word_count compte
-- comme de la planification (ambre). Les changements de word_count sont
-- déjà tracés comme rédaction via chapter_versions.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_daily_plan_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si word_count a changé → rédaction (pas planif). Skip.
  IF TG_OP = 'UPDATE' AND NEW.word_count IS DISTINCT FROM OLD.word_count THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.daily_activity (user_id, date, plan_activity, plan_count)
  VALUES (NEW.user_id, now()::date, true, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET plan_activity = true,
        plan_count = public.daily_activity.plan_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

-- Pas de trigger INSERT : la seule création d'un chapitre n'est pas une "édition".
-- Seules les éditions ultérieures (UPDATE de champs ≠ word_count) comptent.
DROP TRIGGER IF EXISTS trigger_daily_plan_chapter_ins ON public.chapters;

DROP TRIGGER IF EXISTS trigger_daily_plan_chapter_upd ON public.chapters;
CREATE TRIGGER trigger_daily_plan_chapter_upd AFTER UPDATE ON public.chapters
  FOR EACH ROW
  WHEN (NEW.updated_at IS DISTINCT FROM OLD.updated_at)
  EXECUTE FUNCTION public.fn_daily_plan_chapter();

CREATE OR REPLACE FUNCTION public.fn_daily_plan_scene()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.word_count IS DISTINCT FROM OLD.word_count THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.daily_activity (user_id, date, plan_activity, plan_count)
  VALUES (NEW.user_id, now()::date, true, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET plan_activity = true,
        plan_count = public.daily_activity.plan_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

-- Idem : pas de trigger INSERT sur scenes (création ≠ édition).
DROP TRIGGER IF EXISTS trigger_daily_plan_scene_ins ON public.scenes;

DROP TRIGGER IF EXISTS trigger_daily_plan_scene_upd ON public.scenes;
CREATE TRIGGER trigger_daily_plan_scene_upd AFTER UPDATE ON public.scenes
  FOR EACH ROW
  WHEN (NEW.updated_at IS DISTINCT FROM OLD.updated_at)
  EXECUTE FUNCTION public.fn_daily_plan_scene();

-- ---------------------------------------------------------------------------
-- 8. Backfill historique (idempotent : remplace entièrement)
-- ---------------------------------------------------------------------------

TRUNCATE public.daily_activity;

-- 8.a — RÉDACTION (historique : deltas NETS de chapter_versions, ROMAN ACTIF UNIQUEMENT)
-- Les suppressions comptent négativement pour que la somme mensuelle matche la
-- croissance nette du roman.
INSERT INTO public.daily_activity (user_id, date, words_written)
SELECT user_id, day, SUM(delta)
FROM (
  SELECT
    cv.user_id,
    cv.created_at::date AS day,
    (cv.word_count - LAG(cv.word_count, 1, 0) OVER (PARTITION BY cv.chapter_id ORDER BY cv.created_at)) AS delta
  FROM public.chapter_versions cv
  JOIN public.chapters c ON c.id = cv.chapter_id
  JOIN public.novels n ON n.id = c.novel_id
  WHERE n.is_active = true
) sub
GROUP BY user_id, day
ON CONFLICT (user_id, date) DO UPDATE
  SET words_written = EXCLUDED.words_written;

-- 8.a bis — CATCH-UP : delta NET entre chapters.word_count et la dernière version
-- snapshotée (peut être négatif si le chapitre a rétréci depuis le dernier snapshot).
-- Roman actif uniquement, delta attribué à chapters.updated_at.
INSERT INTO public.daily_activity (user_id, date, words_written)
SELECT
  c.user_id,
  c.updated_at::date AS day,
  SUM(c.word_count - COALESCE(v.last_wc, 0)) AS delta
FROM public.chapters c
JOIN public.novels n ON n.id = c.novel_id AND n.is_active = true
LEFT JOIN (
  SELECT DISTINCT ON (chapter_id)
    chapter_id, word_count AS last_wc
  FROM public.chapter_versions
  ORDER BY chapter_id, created_at DESC
) v ON v.chapter_id = c.id
WHERE c.word_count IS NOT NULL
GROUP BY c.user_id, c.updated_at::date
HAVING SUM(c.word_count - COALESCE(v.last_wc, 0)) <> 0
ON CONFLICT (user_id, date) DO UPDATE
  SET words_written = public.daily_activity.words_written + EXCLUDED.words_written,
      updated_at = now();

-- 8.b — WB (uniquement des fiches RÉELLEMENT éditées, i.e. updated_at > created_at)
--     Les simples créations sans édition ultérieure ne colorent PAS le jour.
INSERT INTO public.daily_activity (user_id, date, wb_activity, wb_count)
SELECT user_id, updated_at::date, true, count(*)
FROM public.wb_entries
WHERE updated_at IS NOT NULL
  AND created_at IS NOT NULL
  AND updated_at > created_at + INTERVAL '1 minute'
GROUP BY user_id, updated_at::date
ON CONFLICT (user_id, date) DO UPDATE
  SET wb_activity = true,
      wb_count = EXCLUDED.wb_count;

-- 8.c — PLANIFICATION (postits + milestones uniquement)
--     On exclut chapters/scenes du backfill : leur simple existence ne doit PAS
--     colorer le calendrier. Les futures éditions passent par les triggers 7 bis
--     (chapters/scenes UPDATE) — seuls les changements intentionnels comptent.
INSERT INTO public.daily_activity (user_id, date, plan_activity, plan_count)
SELECT user_id, day, true, count(*)
FROM (
  SELECT user_id, updated_at::date AS day FROM public.planning_postits
  WHERE updated_at IS NOT NULL
    AND created_at IS NOT NULL
    AND updated_at > created_at + INTERVAL '1 minute'
  UNION ALL
  SELECT user_id, created_at::date AS day FROM public.planning_milestones
) u
GROUP BY user_id, day
ON CONFLICT (user_id, date) DO UPDATE
  SET plan_activity = true,
      plan_count = EXCLUDED.plan_count;

-- 8.d — create user_stats pour les profils existants
INSERT INTO public.user_stats (user_id)
SELECT id FROM public.profiles
ON CONFLICT DO NOTHING;
