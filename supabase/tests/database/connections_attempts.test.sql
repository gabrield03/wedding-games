begin;

select plan(49);

select has_table(
  'public',
  'connections_attempts',
  'connections_attempts table exists'
);

select has_column('public', 'connections_attempts', 'id', 'Attempt ID exists');
select has_column(
  'public',
  'connections_attempts',
  'event_id',
  'Attempt Event ID exists'
);
select has_column(
  'public',
  'connections_attempts',
  'player_id',
  'Attempt Player ID exists'
);
select has_column(
  'public',
  'connections_attempts',
  'puzzle_id',
  'Attempt puzzle ID exists'
);
select has_column(
  'public',
  'connections_attempts',
  'tile_map',
  'Attempt tile map exists'
);
select has_column(
  'public',
  'connections_attempts',
  'solved_group_ids',
  'Attempt solved groups exist'
);
select has_column(
  'public',
  'connections_attempts',
  'incorrect_guesses',
  'Attempt incorrect guesses exist'
);
select has_column(
  'public',
  'connections_attempts',
  'version',
  'Attempt version exists'
);
select has_column(
  'public',
  'connections_attempts',
  'created_at',
  'Attempt creation timestamp exists'
);
select has_column(
  'public',
  'connections_attempts',
  'updated_at',
  'Attempt update timestamp exists'
);
select has_column(
  'public',
  'connections_attempts',
  'completed_at',
  'Attempt completion timestamp exists'
);

select col_is_pk(
  'public',
  'connections_attempts',
  'id',
  'connections_attempts.id is the primary key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_event_id_id_unique'
      and contype = 'u'
  ),
  'Players expose the composite Event/ID ownership key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_puzzles'::regclass
      and conname = 'connections_puzzles_event_id_id_unique'
      and contype = 'u'
  ),
  'Connections puzzles expose the composite Event/ID ownership key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_player_fkey'
      and confrelid = 'public.players'::regclass
      and confdeltype = 'c'
  ),
  'Attempts use the composite Event/Player key with delete cascade'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_puzzle_fkey'
      and confrelid = 'public.connections_puzzles'::regclass
      and confdeltype = 'r'
  ),
  'Attempts use the composite Event/puzzle key with delete restricted'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_tile_map_is_array'
      and contype = 'c'
  ),
  'Attempt tile maps must be arrays'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_tile_map_size'
      and contype = 'c'
  ),
  'Attempt tile maps must contain sixteen entries'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_solved_group_count'
      and contype = 'c'
  ),
  'Attempt solved groups are bounded'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_incorrect_guesses_is_array'
      and contype = 'c'
  ),
  'Attempt incorrect guesses must be arrays'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_incorrect_guess_count'
      and contype = 'c'
  ),
  'Attempt incorrect guesses are bounded'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_version_nonnegative'
      and contype = 'c'
  ),
  'Attempt versions are nonnegative'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.connections_attempts'::regclass
      and conname = 'connections_attempts_completion_time'
      and contype = 'c'
  ),
  'Attempt completion cannot predate creation'
);

select ok(
  exists (
    select 1
    from pg_index
    where indexrelid =
      'public.connections_attempts_one_active_per_player_puzzle_idx'::regclass
      and indisunique
      and indpred is not null
  ),
  'Attempts have a partial unique active-attempt index'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.connections_attempts'::regclass
  ),
  'RLS is enabled on Connections Attempts'
);

select ok(
  not has_table_privilege('anon', 'public.connections_attempts', 'select'),
  'anon cannot select Connections Attempts'
);
select ok(
  not has_table_privilege('anon', 'public.connections_attempts', 'insert'),
  'anon cannot insert Connections Attempts'
);
select ok(
  not has_table_privilege('anon', 'public.connections_attempts', 'update'),
  'anon cannot update Connections Attempts'
);
select ok(
  not has_table_privilege('anon', 'public.connections_attempts', 'delete'),
  'anon cannot delete Connections Attempts'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.connections_attempts',
    'select'
  ),
  'authenticated cannot select Connections Attempts'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.connections_attempts',
    'insert'
  ),
  'authenticated cannot insert Connections Attempts'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.connections_attempts',
    'update'
  ),
  'authenticated cannot update Connections Attempts'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.connections_attempts',
    'delete'
  ),
  'authenticated cannot delete Connections Attempts'
);
select ok(
  has_table_privilege('service_role', 'public.connections_attempts', 'select'),
  'service role can select Connections Attempts'
);
select ok(
  has_table_privilege('service_role', 'public.connections_attempts', 'insert'),
  'service role can insert Connections Attempts'
);
select ok(
  has_table_privilege('service_role', 'public.connections_attempts', 'update'),
  'service role can update Connections Attempts'
);
select ok(
  not has_table_privilege(
    'service_role',
    'public.connections_attempts',
    'delete'
  ),
  'service role cannot delete Connections Attempts'
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
    '21000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
    '{}'::jsonb,
    true
  );

insert into public.players (id, event_id, auth_user_id)
values
  (
    '31000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001'
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000002'
  );

insert into public.connections_puzzles (
  id,
  event_id,
  public_id,
  title,
  groups
)
values (
  '41000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'isolation-attempt-puzzle',
  'Isolation Attempt Puzzle',
  '[]'::jsonb
);

select lives_ok(
  $$
    insert into public.connections_attempts (
      id,
      event_id,
      player_id,
      puzzle_id,
      tile_map
    )
    values (
      '41000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000001',
      (
        select id
        from public.connections_puzzles
        where event_id = '00000000-0000-4000-8000-000000000001'
          and public_id = 'development-puzzle'
      ),
      (
        select jsonb_agg(
          jsonb_build_object(
            'token', gen_random_uuid()::text,
            'tileId', 'tile-' || tile_number
          )
        )
        from generate_series(1, 16) as tile_number
      )
    )
  $$,
  'an Event-owned Player can start its Event-owned puzzle'
);

select throws_ok(
  $$
    insert into public.connections_attempts (
      event_id,
      player_id,
      puzzle_id,
      tile_map
    )
    select
      '00000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000002',
      id,
      (select tile_map from public.connections_attempts limit 1)
    from public.connections_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id = 'development-puzzle'
  $$,
  '23503',
  null,
  'an Attempt cannot combine an Event with another Event Player'
);

select throws_ok(
  $$
    insert into public.connections_attempts (
      event_id,
      player_id,
      puzzle_id,
      tile_map
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000002',
      (select tile_map from public.connections_attempts limit 1)
    )
  $$,
  '23503',
  null,
  'an Attempt cannot combine an Event with another Event puzzle'
);

select throws_ok(
  $$
    insert into public.connections_attempts (
      event_id,
      player_id,
      puzzle_id,
      tile_map
    )
    select
      event_id,
      player_id,
      puzzle_id,
      tile_map
    from public.connections_attempts
    where id = '41000000-0000-4000-8000-000000000101'
  $$,
  '23505',
  null,
  'a Player and puzzle cannot have two active Attempts'
);

select lives_ok(
  $$
    update public.connections_attempts
    set completed_at = now()
    where id = '41000000-0000-4000-8000-000000000101'
  $$,
  'an active Attempt can be completed'
);

select lives_ok(
  $$
    insert into public.connections_attempts (
      id,
      event_id,
      player_id,
      puzzle_id,
      tile_map
    )
    select
      '41000000-0000-4000-8000-000000000102',
      event_id,
      player_id,
      puzzle_id,
      tile_map
    from public.connections_attempts
    where id = '41000000-0000-4000-8000-000000000101'
  $$,
  'a completed Attempt permits a new active replay'
);

select lives_ok(
  $$
    update public.connections_attempts
    set completed_at = now()
    where id = '41000000-0000-4000-8000-000000000102'
  $$,
  'the replay Attempt can also be completed'
);

select is(
  (
    select count(*)
    from public.connections_attempts
    where player_id = '31000000-0000-4000-8000-000000000001'
      and completed_at is not null
  ),
  2::bigint,
  'multiple completed Attempts remain available'
);

select throws_ok(
  $$
    delete from public.connections_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id = 'development-puzzle'
  $$,
  '23503',
  null,
  'a puzzle with Attempts cannot be deleted'
);

select lives_ok(
  $$
    delete from public.players
    where id = '31000000-0000-4000-8000-000000000001'
  $$,
  'a Player can be deleted with its Attempts cascading'
);

select is(
  (
    select count(*)
    from public.connections_attempts
    where player_id = '31000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'deleting a Player removes its Connections Attempts'
);

select * from finish();

rollback;
