begin;

select plan(7);

select has_column(
  'public',
  'strands_attempts',
  'active_hint_word',
  'Strands Attempts persist an active hint word'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.strands_attempts'::regclass
      and conname = 'strands_attempts_active_hint_word_format'
  ),
  'active Strands hint words have a canonical format constraint'
);

insert into auth.users (
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_anonymous
)
values (
  '23000000-0000-4000-8000-000000000117',
  'authenticated',
  'authenticated',
  '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
  '{}'::jsonb,
  true
);

insert into public.players (id, event_id, auth_user_id)
values (
  '33000000-0000-4000-8000-000000000117',
  '00000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000117'
);

insert into public.strands_attempts (
  id,
  event_id,
  player_id,
  puzzle_id
)
select
  '63000000-0000-4000-8000-000000000117',
  '00000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000117',
  id
from public.strands_puzzles
where event_id = '00000000-0000-4000-8000-000000000001'
  and public_id = 'wedding-01';

select lives_ok(
  $$
    update public.strands_attempts
    set
      active_hint_word = 'CEREMONY',
      version = 1,
      updated_at = now()
    where id = '63000000-0000-4000-8000-000000000117'
  $$,
  'an active Strands hint can be persisted'
);

select is(
  (
    select active_hint_word
    from public.strands_attempts
    where id = '63000000-0000-4000-8000-000000000117'
  ),
  'CEREMONY',
  'the persisted hint can be read back'
);

select throws_ok(
  $$
    update public.strands_attempts
    set active_hint_word = 'bad hint'
    where id = '63000000-0000-4000-8000-000000000117'
  $$,
  '23514',
  null,
  'malformed active hint words are rejected'
);

select lives_ok(
  $$
    update public.strands_attempts
    set
      active_hint_word = null,
      found_words = array['CEREMONY'],
      version = 2,
      updated_at = now()
    where id = '63000000-0000-4000-8000-000000000117'
  $$,
  'finding the hinted answer can clear the active hint'
);

select is(
  (
    select active_hint_word
    from public.strands_attempts
    where id = '63000000-0000-4000-8000-000000000117'
  ),
  null::text,
  'cleared Strands hint state remains persisted'
);

select * from finish();

rollback;
