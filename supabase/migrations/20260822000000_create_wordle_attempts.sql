alter table public.wordle_puzzles
add constraint wordle_puzzles_event_id_id_unique unique (event_id, id);

create table public.wordle_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  player_id uuid not null,
  puzzle_id uuid not null,
  submitted_guesses text[] not null default '{}',
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint wordle_attempts_player_fkey
    foreign key (event_id, player_id)
    references public.players (event_id, id)
    on delete cascade,
  constraint wordle_attempts_puzzle_fkey
    foreign key (event_id, puzzle_id)
    references public.wordle_puzzles (event_id, id)
    on delete restrict,
  constraint wordle_attempts_guess_count check (
    cardinality(submitted_guesses) <= 6
  ),
  constraint wordle_attempts_guess_format check (
    submitted_guesses::text ~ '^\{([A-Z]{5}(,[A-Z]{5}){0,5})?\}$'
  ),
  constraint wordle_attempts_version_matches_guesses check (
    version = cardinality(submitted_guesses)
  ),
  constraint wordle_attempts_terminal_shape check (
    (
      completed_at is null
      and cardinality(submitted_guesses) < 6
    )
    or (
      completed_at is not null
      and cardinality(submitted_guesses) between 1 and 6
    )
  ),
  constraint wordle_attempts_completion_time check (
    completed_at is null or completed_at >= created_at
  )
);

create unique index wordle_attempts_one_active_per_player_puzzle_idx
on public.wordle_attempts (event_id, player_id, puzzle_id)
where completed_at is null;

revoke all on table public.wordle_attempts
from anon, authenticated, service_role;

grant select, insert, update on table public.wordle_attempts
to service_role;

alter table public.wordle_attempts enable row level security;
