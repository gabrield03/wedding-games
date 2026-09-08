create table public.strands_puzzles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  public_id text not null,
  theme_clue text not null,
  grid_rows integer not null,
  grid_columns integer not null,
  grid_letters text not null,
  theme_words jsonb not null,
  spangram jsonb not null,
  created_at timestamptz not null default now(),
  constraint strands_puzzles_event_id_fkey
    foreign key (event_id)
    references public.events (id)
    on delete cascade,
  constraint strands_puzzles_event_id_public_id_unique
    unique (event_id, public_id),
  constraint strands_puzzles_event_id_id_unique
    unique (event_id, id),
  constraint strands_puzzles_public_id_format check (
    char_length(public_id) between 1 and 100
    and public_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint strands_puzzles_theme_clue_not_blank check (
    char_length(btrim(theme_clue)) between 1 and 200
  ),
  constraint strands_puzzles_grid_shape check (
    grid_rows = 8
    and grid_columns = 6
    and grid_letters ~ '^[A-Z]{48}$'
  ),
  constraint strands_puzzles_theme_words_is_array check (
    jsonb_typeof(theme_words) = 'array'
  ),
  constraint strands_puzzles_spangram_is_object check (
    jsonb_typeof(spangram) = 'object'
  )
);

revoke all on table public.strands_puzzles
from anon, authenticated, service_role;

grant select on table public.strands_puzzles
to service_role;

alter table public.strands_puzzles enable row level security;

create table public.strands_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  player_id uuid not null,
  puzzle_id uuid not null,
  found_words text[] not null default '{}',
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint strands_attempts_player_fkey
    foreign key (event_id, player_id)
    references public.players (event_id, id)
    on delete cascade,
  constraint strands_attempts_puzzle_fkey
    foreign key (event_id, puzzle_id)
    references public.strands_puzzles (event_id, id)
    on delete restrict,
  constraint strands_attempts_found_word_count check (
    cardinality(found_words) <= 20
  ),
  constraint strands_attempts_version_nonnegative check (
    version >= 0
  ),
  constraint strands_attempts_completion_time check (
    completed_at is null or completed_at >= created_at
  )
);

create unique index strands_attempts_one_active_per_player_puzzle_idx
on public.strands_attempts (event_id, player_id, puzzle_id)
where completed_at is null;

revoke all on table public.strands_attempts
from anon, authenticated, service_role;

grant select, insert, update on table public.strands_attempts
to service_role;

alter table public.strands_attempts enable row level security;
