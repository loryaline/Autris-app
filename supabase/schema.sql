-- ===== AUTRIS — Schema SQL MVP =====
-- Exécuter dans Supabase > SQL Editor

-- 1. Profiles (créé automatiquement à l'inscription)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_annual')),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  genre text not null default 'contemporain'
    check (genre in ('fantasy', 'sf', 'thriller', 'polar', 'horreur', 'romance', 'historique', 'contemporain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can CRUD own projects"
  on public.projects for all
  using (auth.uid() = user_id);

-- 3. Novels
create table public.novels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  current_words integer not null default 0,
  word_goal integer,
  ui_theme text not null default 'blanc'
    check (ui_theme in ('blanc', 'fantasy', 'horreur', 'sf', 'polar', 'romance', 'historique', 'contemporain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.novels enable row level security;

create policy "Users can CRUD own novels"
  on public.novels for all
  using (auth.uid() = user_id);

-- 4. Chapters
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Sans titre',
  position integer not null default 0,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  synopsis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chapters enable row level security;

create policy "Users can CRUD own chapters"
  on public.chapters for all
  using (auth.uid() = user_id);

-- 5. Scenes
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Sans titre',
  content text not null default '',
  word_count integer not null default 0,
  position integer not null default 0,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scenes enable row level security;

create policy "Users can CRUD own scenes"
  on public.scenes for all
  using (auth.uid() = user_id);

-- ===== TRIGGERS =====

-- Trigger: créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: recalculer current_words du roman après update d'une scène
create or replace function public.update_novel_word_count()
returns trigger as $$
begin
  update public.novels
  set current_words = (
    select coalesce(sum(s.word_count), 0)
    from public.scenes s
    join public.chapters c on c.id = s.chapter_id
    where c.novel_id = (
      select c2.novel_id from public.chapters c2 where c2.id = coalesce(new.chapter_id, old.chapter_id)
    )
  ),
  updated_at = now()
  where id = (
    select c3.novel_id from public.chapters c3 where c3.id = coalesce(new.chapter_id, old.chapter_id)
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_scene_word_count_change
  after insert or update of word_count or delete on public.scenes
  for each row execute function public.update_novel_word_count();

-- Trigger: mettre à jour updated_at automatiquement
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.projects
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.novels
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.chapters
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.scenes
  for each row execute function public.update_updated_at();
