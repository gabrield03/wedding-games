create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  created_at timestamptz not null default now(),
  constraint events_slug_unique unique (slug),
  constraint events_slug_format check (
    char_length(slug) between 1 and 63
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint players_event_id_fkey
    foreign key (event_id)
    references public.events (id)
    on delete restrict,
  constraint players_auth_user_id_fkey
    foreign key (auth_user_id)
    references auth.users (id)
    on delete cascade,
  constraint players_event_id_auth_user_id_unique
    unique (event_id, auth_user_id)
);

revoke all on table public.events from anon, authenticated;
revoke all on table public.players from anon, authenticated;

grant select on table public.players to authenticated;

alter table public.events enable row level security;
alter table public.players enable row level security;

create policy "Authenticated users can read their own Player rows"
on public.players
for select
to authenticated
using ((select auth.uid()) = auth_user_id);
