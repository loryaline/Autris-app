-- La liste d'idées.
--
-- Une boîte de réception, pas une usine. Une idée arrive rarement à son
-- heure : dans le métro, sous la douche, à deux heures du matin. Elle
-- finissait dans les notes du téléphone, dans un carnet, ou nulle part —
-- et Autris ne la revoyait jamais.
--
-- Ce qu'elle N'EST PAS : un système de conversion. Transformer une idée en
-- fiche, en chapitre ou en scène d'un clic supposerait une correspondance
-- de champs qui ne peut être qu'approximative — une idée est une phrase,
-- une fiche a une structure. On obtiendrait des fiches à moitié remplies à
-- reprendre entièrement. L'autrice relit son idée à côté de ce qu'elle
-- écrit, et décide elle-même.
--
-- Portée : la boîte se lit par user_id SEUL, jamais par projet. C'est ce
-- qui la rend consultable de partout, y compris depuis un projet auquel
-- l'idée n'appartient pas. project_id ne sert qu'à filtrer et à s'y
-- retrouver quand la boîte grossit — jamais à cloisonner.
--
-- À exécuter dans le SQL Editor de Supabase.

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Facultatif : au moment de la capture, on ne sait souvent pas encore à
  -- quel roman l'idée appartient. L'obliger à choisir tuerait l'usage.
  project_id uuid references public.projects(id) on delete set null,
  body text not null default '',
  -- Rangée sans être perdue : une idée archivée sort de la boîte, pas de
  -- l'univers. Rien ne supprime automatiquement.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- L'index suit la lecture : toute la boîte d'une personne, la plus récente
-- d'abord. Le filtre par projet se fait ensuite, sur un jeu déjà réduit.
create index if not exists ideas_user_created_idx
  on public.ideas (user_id, created_at desc);

alter table public.ideas enable row level security;

drop policy if exists "ideas_own" on public.ideas;
create policy "ideas_own" on public.ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at, comme partout ailleurs.
create or replace function public.fn_ideas_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_ideas_touch on public.ideas;
create trigger trigger_ideas_touch
  before update on public.ideas
  for each row
  execute function public.fn_ideas_touch();
