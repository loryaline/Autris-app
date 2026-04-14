-- ============================================
-- Migration: Planning Module
-- ============================================

-- 1. Add planning metadata columns to chapters
-- Default columns: Chapitre(title), Mot/thème, Tempo, Résumé,
-- Éléments intrigue globale, Éléments mineurs/ambiances,
-- Observations/remarques, Indices/tension, Bascule, Nœud narratif
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS tempo text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS theme text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS plot_elements text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS minor_elements text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS tension_indices text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS pivot text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS narrative_knot text;

-- Store column order per novel (JSONB array of column keys)
ALTER TABLE public.novels ADD COLUMN IF NOT EXISTS column_order jsonb;

-- 2. Custom planning columns (per novel)
CREATE TABLE IF NOT EXISTS public.planning_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  position integer NOT NULL DEFAULT 0,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own planning_columns"
  ON public.planning_columns FOR ALL
  USING (auth.uid() = user_id);

-- 3. Cell values for custom columns
CREATE TABLE IF NOT EXISTS public.planning_cell_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.planning_columns(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(column_id, chapter_id)
);

ALTER TABLE public.planning_cell_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own planning_cell_values"
  ON public.planning_cell_values FOR ALL
  USING (auth.uid() = user_id);

-- 4. Post-its table
CREATE TABLE IF NOT EXISTS public.planning_postits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'yellow',
  position_x float4 NOT NULL DEFAULT 0,
  position_y float4 NOT NULL DEFAULT 0,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_postits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own planning_postits"
  ON public.planning_postits FOR ALL
  USING (auth.uid() = user_id);

-- 5. Milestones table
CREATE TABLE IF NOT EXISTS public.planning_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  target_date date,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'done')),
  color text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own planning_milestones"
  ON public.planning_milestones FOR ALL
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.planning_postits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
