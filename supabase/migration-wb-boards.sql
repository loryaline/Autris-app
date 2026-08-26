-- Plateaux du World Building (lot 1).
--
-- Un plateau est une surface infinie sur laquelle on dispose :
--   - des VIGNETTES qui référencent une fiche (wb_entries) — données vivantes
--   - des POST-ITS libres, qui n'appartiennent qu'au plateau
-- et des arêtes qui sont soit des LIENS typés (adossés à wb_links),
-- soit des FLÈCHES libres.
--
-- Règle de vérité : le plateau ne stocke QUE la géométrie. Supprimer un
-- nœud ou une arête ne touche jamais wb_entries ni wb_links — aucune
-- cascade dans ce sens. Rompre un lien passe par la fiche.
--
-- À exécuter dans le SQL Editor de Supabase.

-- ---------------------------------------------------------------------------
-- 1. Plateaux
-- ---------------------------------------------------------------------------
create table if not exists public.wb_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- null = plateau de tout le projet (cas par défaut)
  novel_id uuid references public.novels(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Plateau',
  description text not null default '',
  -- true = plateau principal du projet, ouvert par défaut à l'arrivée
  is_main boolean not null default false,
  -- Dernière position de lecture : { x, y, zoom }
  viewport jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wb_boards_project_idx
  on public.wb_boards (project_id, created_at);

-- Un seul plateau principal par projet.
create unique index if not exists wb_boards_one_main_per_project
  on public.wb_boards (project_id) where is_main;

-- ---------------------------------------------------------------------------
-- 2. Nœuds (vignettes, post-its, …)
-- ---------------------------------------------------------------------------
create table if not exists public.wb_board_nodes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.wb_boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'fiche' | 'postit'  (lot 2 : 'texte' | 'forme' | 'image' | 'cadre')
  kind text not null,
  -- Renseigné pour kind = 'fiche'. PAS unique : une fiche peut être posée
  -- plusieurs fois sur le même plateau (branches éloignées d'un arbre).
  -- La vignette disparaît si la fiche est supprimée — c'est le seul sens de
  -- cascade autorisé (fiche → vignette), jamais l'inverse.
  entry_id uuid references public.wb_entries(id) on delete cascade,
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 200,
  h double precision not null default 120,
  z integer not null default 0,
  rotation double precision not null default 0,
  -- Contenu propre aux nœuds libres : { html } pour un post-it
  content jsonb not null default '{}'::jsonb,
  -- Apparence : { color, ... }
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wb_board_nodes_board_idx
  on public.wb_board_nodes (board_id);
create index if not exists wb_board_nodes_entry_idx
  on public.wb_board_nodes (entry_id);

-- ---------------------------------------------------------------------------
-- 3. Arêtes (liens typés et flèches libres)
-- ---------------------------------------------------------------------------
create table if not exists public.wb_board_edges (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.wb_boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_node_id uuid not null references public.wb_board_nodes(id) on delete cascade,
  to_node_id uuid not null references public.wb_board_nodes(id) on delete cascade,
  -- Renseigné = lien typé : l'étiquette vient de wb_links, jamais d'ici.
  -- PAS unique : une même relation peut être tracée entre deux paires de
  -- copies. ON DELETE SET NULL : si la relation est rompue depuis la
  -- fiche, la flèche subsiste et redevient une flèche libre plutôt que
  -- de disparaître sans prévenir.
  wb_link_id uuid references public.wb_links(id) on delete set null,
  -- Étiquette des flèches libres uniquement
  label text not null default '',
  waypoints jsonb not null default '[]'::jsonb,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wb_board_edges_board_idx
  on public.wb_board_edges (board_id);
create index if not exists wb_board_edges_nodes_idx
  on public.wb_board_edges (from_node_id, to_node_id);

-- ---------------------------------------------------------------------------
-- 4. RLS — même schéma que le reste d'Autris
-- ---------------------------------------------------------------------------
alter table public.wb_boards enable row level security;
alter table public.wb_board_nodes enable row level security;
alter table public.wb_board_edges enable row level security;

drop policy if exists "wb_boards_own" on public.wb_boards;
create policy "wb_boards_own" on public.wb_boards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wb_board_nodes_own" on public.wb_board_nodes;
create policy "wb_board_nodes_own" on public.wb_board_nodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wb_board_edges_own" on public.wb_board_edges;
create policy "wb_board_edges_own" on public.wb_board_edges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.wb_boards;
create trigger set_updated_at before update on public.wb_boards
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at on public.wb_board_nodes;
create trigger set_updated_at before update on public.wb_board_nodes
  for each row execute function public.update_updated_at();
