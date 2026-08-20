create table public.wordle_puzzles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  public_id text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  constraint wordle_puzzles_event_id_fkey
    foreign key (event_id)
    references public.events (id)
    on delete cascade,
  constraint wordle_puzzles_event_id_public_id_unique
    unique (event_id, public_id),
  constraint wordle_puzzles_public_id_format check (
    char_length(public_id) between 1 and 100
    and public_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint wordle_puzzles_answer_format check (
    answer ~ '^[A-Z]{5}$'
  )
);

revoke all on table public.wordle_puzzles
from anon, authenticated, service_role;

grant select on table public.wordle_puzzles to service_role;

alter table public.wordle_puzzles enable row level security;
