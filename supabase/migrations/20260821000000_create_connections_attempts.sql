alter table public.players
add constraint players_event_id_id_unique unique (event_id, id);

alter table public.connections_puzzles
add constraint connections_puzzles_event_id_id_unique unique (event_id, id);

create table public.connections_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  player_id uuid not null,
  puzzle_id uuid not null,
  tile_map jsonb not null,
  solved_group_ids text[] not null default '{}',
  incorrect_guesses jsonb not null default '[]'::jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint connections_attempts_player_fkey
    foreign key (event_id, player_id)
    references public.players (event_id, id)
    on delete cascade,
  constraint connections_attempts_puzzle_fkey
    foreign key (event_id, puzzle_id)
    references public.connections_puzzles (event_id, id)
    on delete restrict,
  constraint connections_attempts_tile_map_is_array check (
    jsonb_typeof(tile_map) = 'array'
  ),
  constraint connections_attempts_tile_map_size check (
    jsonb_array_length(tile_map) = 16
  ),
  constraint connections_attempts_solved_group_count check (
    cardinality(solved_group_ids) <= 4
  ),
  constraint connections_attempts_incorrect_guesses_is_array check (
    jsonb_typeof(incorrect_guesses) = 'array'
  ),
  constraint connections_attempts_incorrect_guess_count check (
    jsonb_array_length(incorrect_guesses) <= 4
  ),
  constraint connections_attempts_version_nonnegative check (version >= 0),
  constraint connections_attempts_completion_time check (
    completed_at is null or completed_at >= created_at
  )
);

create unique index connections_attempts_one_active_per_player_puzzle_idx
on public.connections_attempts (event_id, player_id, puzzle_id)
where completed_at is null;

revoke all on table public.connections_attempts
from anon, authenticated, service_role;

grant select, insert, update on table public.connections_attempts
to service_role;

alter table public.connections_attempts enable row level security;
