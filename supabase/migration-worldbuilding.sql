-- ============================================
-- Migration: World Building Module (Lot 1)
-- ============================================
-- À exécuter dans Supabase > SQL Editor

-- 1. Table principale des fiches WB
CREATE TABLE IF NOT EXISTS public.wb_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  subcategory text,
  title text NOT NULL DEFAULT 'Sans titre',
  subtitle text,
  description text NOT NULL DEFAULT '',
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  personal_notes text NOT NULL DEFAULT '',
  main_image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'brouillon'
    CHECK (status IN ('brouillon', 'valide', 'archive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wb_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own wb_entries"
  ON public.wb_entries FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wb_entries_project_category_idx
  ON public.wb_entries(project_id, category);

-- 2. Liens bidirectionnels entre fiches
CREATE TABLE IF NOT EXISTS public.wb_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entry_id uuid NOT NULL REFERENCES public.wb_entries(id) ON DELETE CASCADE,
  to_entry_id uuid NOT NULL REFERENCES public.wb_entries(id) ON DELETE CASCADE,
  link_type text,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_entry_id, to_entry_id)
);

ALTER TABLE public.wb_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own wb_links"
  ON public.wb_links FOR ALL
  USING (auth.uid() = user_id);

-- 3. Trigger updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.wb_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Bucket Storage pour les images WB
-- (à créer via l'UI Supabase OU via SQL ci-dessous)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wb-images', 'wb-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique: upload/read/delete seulement par l'owner
CREATE POLICY "Users can upload own wb images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wb-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own wb images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wb-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own wb images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wb-images' AND auth.uid()::text = (storage.foldername(name))[1]);
