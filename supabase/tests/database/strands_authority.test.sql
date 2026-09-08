begin;

select plan(12);

select has_table(
  'public',
  'strands_puzzles',
  'strands_puzzles table exists'
);

select has_table(
  'public',
  'strands_attempts',
  'strands_attempts table exists'
);

select col_is_pk(
  'public',
  'strands_puzzles',
  'id',
  'strands_puzzles.id is the primary key'
);

select col_is_pk(
  'public',
  'strands_attempts',
  'id',
  'strands_attempts.id is the primary key'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.strands_puzzles'::regclass
  ),
  'RLS is enabled on Strands puzzles'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.strands_attempts'::regclass
  ),
  'RLS is enabled on Strands attempts'
);

select ok(
  has_table_privilege('service_role', 'public.strands_puzzles', 'select'),
  'service role can select Strands puzzles'
);

select ok(
  not has_table_privilege('authenticated', 'public.strands_puzzles', 'select'),
  'authenticated users cannot select Strands puzzles'
);

select ok(
  has_table_privilege('service_role', 'public.strands_attempts', 'select')
  and has_table_privilege('service_role', 'public.strands_attempts', 'insert')
  and has_table_privilege('service_role', 'public.strands_attempts', 'update'),
  'service role can manage Strands attempts'
);

select is(
  (
    select count(*)
    from public.strands_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id like 'wedding-%'
  ),
  5::bigint,
  'the current Event has all five production Strands puzzles'
);

select is(
  (
    select count(*)
    from public.strands_puzzles
    where event_id = '00000000-0000-4000-8000-000000000002'
      and public_id like 'wedding-%'
  ),
  0::bigint,
  'the isolation Event does not receive production Strands content'
);

select ok(
  to_regclass(
    'public.strands_attempts_one_active_per_player_puzzle_idx'
  ) is not null,
  'Strands attempts enforce one active attempt per Player and puzzle'
);

select * from finish();

rollback;
