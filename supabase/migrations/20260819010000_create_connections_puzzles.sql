create table public.connections_puzzles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  public_id text not null,
  title text not null,
  groups jsonb not null,
  created_at timestamptz not null default now(),
  constraint connections_puzzles_event_id_fkey
    foreign key (event_id)
    references public.events (id)
    on delete cascade,
  constraint connections_puzzles_event_id_public_id_unique
    unique (event_id, public_id),
  constraint connections_puzzles_public_id_format check (
    char_length(public_id) between 1 and 100
    and public_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint connections_puzzles_title_length check (
    char_length(btrim(title)) between 1 and 200
  ),
  constraint connections_puzzles_groups_is_array check (
    jsonb_typeof(groups) = 'array'
  )
);

revoke all on table public.connections_puzzles
from anon, authenticated, service_role;

grant select on table public.connections_puzzles to service_role;

alter table public.connections_puzzles enable row level security;
