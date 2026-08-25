-- Versions du tableau de planification (snapshots).
-- Chaque snapshot fige l'état complet du chapitrage d'un roman :
-- chapitres (champs planif), colonnes custom, valeurs de cases,
-- couleurs et préférences d'affichage — dans un blob JSON.
-- À exécuter dans le SQL Editor de Supabase.

create table if not exists public.planning_snapshots (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- true = snapshot de sécurité créé automatiquement avant une restauration
  auto boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists planning_snapshots_novel_idx
  on public.planning_snapshots (novel_id, created_at desc);

alter table public.planning_snapshots enable row level security;

drop policy if exists "snapshots_select_own" on public.planning_snapshots;
create policy "snapshots_select_own" on public.planning_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists "snapshots_insert_own" on public.planning_snapshots;
create policy "snapshots_insert_own" on public.planning_snapshots
  for insert with check (auth.uid() = user_id);

drop policy if exists "snapshots_delete_own" on public.planning_snapshots;
create policy "snapshots_delete_own" on public.planning_snapshots
  for delete using (auth.uid() = user_id);
