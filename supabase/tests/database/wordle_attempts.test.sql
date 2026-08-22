begin;

select plan(48);

select has_table('public', 'wordle_attempts', 'wordle_attempts table exists');
select has_column('public', 'wordle_attempts', 'id', 'Attempt ID exists');
select has_column('public', 'wordle_attempts', 'event_id', 'Event ID exists');
select has_column('public', 'wordle_attempts', 'player_id', 'Player ID exists');
select has_column('public', 'wordle_attempts', 'puzzle_id', 'Puzzle ID exists');
select has_column(
  'public',
  'wordle_attempts',
  'submitted_guesses',
  'submitted guesses exist'
);
select has_column('public', 'wordle_attempts', 'version', 'version exists');
select has_column(
  'public',
  'wordle_attempts',
  'created_at',
  'creation timestamp exists'
);
select has_column(
  'public',
  'wordle_attempts',
  'updated_at',
  'update timestamp exists'
);
select has_column(
  'public',
  'wordle_attempts',
  'completed_at',
  'completion timestamp exists'
);
select col_is_pk(
  'public',
  'wordle_attempts',
  'id',
  'wordle_attempts.id is the primary key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_puzzles'::regclass
      and conname = 'wordle_puzzles_event_id_id_unique'
      and contype = 'u'
  ),
  'Wordle puzzles expose the composite Event/ID ownership key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_player_fkey'
      and confrelid = 'public.players'::regclass
      and confdeltype = 'c'
  ),
  'Attempts use the composite Event/Player key with delete cascade'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_puzzle_fkey'
      and confrelid = 'public.wordle_puzzles'::regclass
      and confdeltype = 'r'
  ),
  'Attempts use the composite Event/puzzle key with delete restricted'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_guess_count'
  ),
  'submitted guesses are bounded'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_guess_format'
  ),
  'submitted guesses have canonical format'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_version_matches_guesses'
  ),
  'version matches accepted-guess count'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_terminal_shape'
  ),
  'terminal shape is constrained'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.wordle_attempts'::regclass
      and conname = 'wordle_attempts_completion_time'
  ),
  'completion cannot predate creation'
);
select ok(
  exists (
    select 1
    from pg_index
    where indexrelid =
      'public.wordle_attempts_one_active_per_player_puzzle_idx'::regclass
      and indisunique
      and indpred is not null
  ),
  'Attempts have a partial unique active-attempt index'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.wordle_attempts'::regclass
  ),
  'RLS is enabled on Wordle Attempts'
);

select ok(
  not has_table_privilege('anon', 'public.wordle_attempts', 'select'),
  'anon cannot select Wordle Attempts'
);
select ok(
  not has_table_privilege('anon', 'public.wordle_attempts', 'insert'),
  'anon cannot insert Wordle Attempts'
);
select ok(
  not has_table_privilege('anon', 'public.wordle_attempts', 'update'),
  'anon cannot update Wordle Attempts'
);
select ok(
  not has_table_privilege('anon', 'public.wordle_attempts', 'delete'),
  'anon cannot delete Wordle Attempts'
);
select ok(
  not has_table_privilege('authenticated', 'public.wordle_attempts', 'select'),
  'authenticated cannot select Wordle Attempts'
);
select ok(
  not has_table_privilege('authenticated', 'public.wordle_attempts', 'insert'),
  'authenticated cannot insert Wordle Attempts'
);
select ok(
  not has_table_privilege('authenticated', 'public.wordle_attempts', 'update'),
  'authenticated cannot update Wordle Attempts'
);
select ok(
  not has_table_privilege('authenticated', 'public.wordle_attempts', 'delete'),
  'authenticated cannot delete Wordle Attempts'
);
select ok(
  has_table_privilege('service_role', 'public.wordle_attempts', 'select'),
  'service role can select Wordle Attempts'
);
select ok(
  has_table_privilege('service_role', 'public.wordle_attempts', 'insert'),
  'service role can insert Wordle Attempts'
);
select ok(
  has_table_privilege('service_role', 'public.wordle_attempts', 'update'),
  'service role can update Wordle Attempts'
);
select ok(
  not has_table_privilege('service_role', 'public.wordle_attempts', 'delete'),
  'service role cannot delete Wordle Attempts'
);

insert into auth.users (
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_anonymous
)
values
  (
    '22000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
    '{}'::jsonb,
    true
  );

insert into public.players (id, event_id, auth_user_id)
values
  (
    '32000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001'
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002'
  );

insert into public.wordle_puzzles (
  id,
  event_id,
  public_id,
  answer
)
values (
  '42000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'isolation-attempt-puzzle',
  'OTHER'
);

select lives_ok(
  $$
    insert into public.wordle_attempts (
      id,
      event_id,
      player_id,
      puzzle_id
    )
    values (
      '62000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      (
        select id
        from public.wordle_puzzles
        where event_id = '00000000-0000-4000-8000-000000000001'
          and public_id = 'wedding-01'
      )
    )
  $$,
  'an Event-owned Player can start its Event-owned puzzle'
);
select throws_ok(
  $$
    insert into public.wordle_attempts (event_id, player_id, puzzle_id)
    select
      '00000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000002',
      id
    from public.wordle_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id = 'wedding-01'
  $$,
  '23503',
  null,
  'an Attempt cannot combine an Event with another Event Player'
);
select throws_ok(
  $$
    insert into public.wordle_attempts (event_id, player_id, puzzle_id)
    values (
      '00000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000002'
    )
  $$,
  '23503',
  null,
  'an Attempt cannot combine an Event with another Event puzzle'
);
select throws_ok(
  $$
    insert into public.wordle_attempts (event_id, player_id, puzzle_id)
    select event_id, player_id, puzzle_id
    from public.wordle_attempts
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23505',
  null,
  'a Player and puzzle cannot have two active Attempts'
);
select throws_ok(
  $$
    update public.wordle_attempts
    set submitted_guesses = array['TOOLONG'], version = 1
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'stored guesses must use canonical five-letter format'
);
select throws_ok(
  $$
    update public.wordle_attempts
    set submitted_guesses = array['CRANE'], version = 0
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'version must match the accepted-guess count'
);
select throws_ok(
  $$
    update public.wordle_attempts
    set submitted_guesses = array[
      'SLATE', 'SLATE', 'SLATE', 'SLATE', 'SLATE', 'SLATE', 'SLATE'
    ], version = 7, completed_at = now()
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'Attempts cannot exceed six guesses'
);
select throws_ok(
  $$
    update public.wordle_attempts
    set submitted_guesses = array[
      'SLATE', 'SLATE', 'SLATE', 'SLATE', 'SLATE', 'SLATE'
    ], version = 6
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'a six-guess Attempt cannot remain active'
);
select lives_ok(
  $$
    update public.wordle_attempts
    set submitted_guesses = array['BRIDE'], version = 1, completed_at = now()
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  'an active Attempt can be completed'
);
select lives_ok(
  $$
    insert into public.wordle_attempts (
      id,
      event_id,
      player_id,
      puzzle_id
    )
    select
      '62000000-0000-4000-8000-000000000002',
      event_id,
      player_id,
      puzzle_id
    from public.wordle_attempts
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  'a completed Attempt permits a new active replay'
);
select lives_ok(
  $$
    update public.wordle_attempts
    set submitted_guesses = array['BRIDE'], version = 1, completed_at = now()
    where id = '62000000-0000-4000-8000-000000000002'
  $$,
  'the replay Attempt can also be completed'
);
select is(
  (
    select count(*)
    from public.wordle_attempts
    where player_id = '32000000-0000-4000-8000-000000000001'
      and completed_at is not null
  ),
  2::bigint,
  'multiple completed Attempts remain available'
);
select throws_ok(
  $$
    delete from public.wordle_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id = 'wedding-01'
  $$,
  '23503',
  null,
  'a puzzle with Attempts cannot be deleted'
);
select lives_ok(
  $$
    delete from public.players
    where id = '32000000-0000-4000-8000-000000000001'
  $$,
  'a Player can be deleted with its Attempts cascading'
);
select is(
  (
    select count(*)
    from public.wordle_attempts
    where player_id = '32000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'deleting a Player removes its Wordle Attempts'
);

select * from finish();

rollback;
