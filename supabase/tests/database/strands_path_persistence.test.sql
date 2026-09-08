begin;

select plan(5);

insert into auth.users (
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_anonymous
)
values (
  '23000000-0000-4000-8000-000000000115',
  'authenticated',
  'authenticated',
  '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
  '{}'::jsonb,
  true
);

insert into public.players (id, event_id, auth_user_id)
values (
  '33000000-0000-4000-8000-000000000115',
  '00000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000115'
);

select lives_ok(
  $$
    insert into public.strands_attempts (
      id,
      event_id,
      player_id,
      puzzle_id
    )
    select
      '63000000-0000-4000-8000-000000000115',
      '00000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000115',
      id
    from public.strands_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id = 'wedding-01'
  $$,
  'a Player can start a persisted Strands Attempt'
);

select lives_ok(
  $$
    update public.strands_attempts
    set
      found_words = array['CEREMONY'],
      version = 1,
      updated_at = now()
    where id = '63000000-0000-4000-8000-000000000115'
  $$,
  'a newly found Strands answer can be persisted'
);

select is(
  (
    select found_words
    from public.strands_attempts
    where id = '63000000-0000-4000-8000-000000000115'
  ),
  array['CEREMONY']::text[],
  'persisted Strands progress can be read back'
);

select lives_ok(
  $$
    update public.strands_attempts
    set
      found_words = array[
        'CEREMONY',
        'RECEPTION',
        'BOUQUET',
        'GUESTS',
        'VOWS',
        'VEIL',
        'WEDDINGDAY'
      ],
      version = 7,
      updated_at = now(),
      completed_at = now()
    where id = '63000000-0000-4000-8000-000000000115'
  $$,
  'the final Strands answer can mark the Attempt complete'
);

select ok(
  (
    select completed_at is not null
      and version = 7
      and cardinality(found_words) = 7
    from public.strands_attempts
    where id = '63000000-0000-4000-8000-000000000115'
  ),
  'completed Strands progress remains persisted'
);

select * from finish();

rollback;
