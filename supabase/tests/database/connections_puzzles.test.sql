begin;

select plan(33);

select has_table(
  'public',
  'connections_puzzles',
  'connections_puzzles table exists'
);

select has_column(
  'public',
  'connections_puzzles',
  'id',
  'connections_puzzles.id exists'
);
select has_column(
  'public',
  'connections_puzzles',
  'event_id',
  'connections_puzzles.event_id exists'
);
select has_column(
  'public',
  'connections_puzzles',
  'public_id',
  'connections_puzzles.public_id exists'
);
select has_column(
  'public',
  'connections_puzzles',
  'title',
  'connections_puzzles.title exists'
);
select has_column(
  'public',
  'connections_puzzles',
  'groups',
  'connections_puzzles.groups exists'
);
select has_column(
  'public',
  'connections_puzzles',
  'created_at',
  'connections_puzzles.created_at exists'
);

select col_is_pk(
  'public',
  'connections_puzzles',
  'id',
  'connections_puzzles.id is the primary key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_puzzles'::regclass
      and conname = 'connections_puzzles_event_id_public_id_unique'
      and contype = 'u'
  ),
  'Connections public IDs are unique within an Event'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_puzzles'::regclass
      and conname = 'connections_puzzles_event_id_fkey'
      and contype = 'f'
      and confrelid = 'public.events'::regclass
      and confdeltype = 'c'
  ),
  'Connections puzzles belong to an Event with delete cascade'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_puzzles'::regclass
      and conname = 'connections_puzzles_public_id_format'
      and contype = 'c'
  ),
  'Connections public IDs have a format constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_puzzles'::regclass
      and conname = 'connections_puzzles_title_length'
      and contype = 'c'
  ),
  'Connections puzzle titles have a length constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections_puzzles'::regclass
      and conname = 'connections_puzzles_groups_is_array'
      and contype = 'c'
  ),
  'Connections groups must be a JSON array'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.connections_puzzles'::regclass
  ),
  'RLS is enabled on Connections puzzles'
);

select ok(
  not has_table_privilege('anon', 'public.connections_puzzles', 'select'),
  'anon cannot select Connections puzzles'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.connections_puzzles',
    'select'
  ),
  'authenticated users cannot select Connections puzzles'
);
select ok(
  has_table_privilege('service_role', 'public.connections_puzzles', 'select'),
  'service role can select Connections puzzles'
);
select ok(
  not has_table_privilege('service_role', 'public.connections_puzzles', 'insert'),
  'service role cannot insert Connections puzzles'
);
select ok(
  not has_table_privilege('service_role', 'public.connections_puzzles', 'update'),
  'service role cannot update Connections puzzles'
);
select ok(
  not has_table_privilege('service_role', 'public.connections_puzzles', 'delete'),
  'service role cannot delete Connections puzzles'
);

select lives_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values
      (
        '00000000-0000-4000-8000-000000000001',
        'shared-test-puzzle',
        'Current Event Copy',
        '[]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000002',
        'shared-test-puzzle',
        'Isolation Event Copy',
        '[]'::jsonb
      )
  $$,
  'the same public puzzle ID may exist in different Events'
);

select is(
  (
    select count(*)
    from public.connections_puzzles
    where public_id = 'shared-test-puzzle'
  ),
  2::bigint,
  'event-scoped copies are stored separately'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      'shared-test-puzzle',
      'Duplicate',
      '[]'::jsonb
    )
  $$,
  '23505',
  null,
  'duplicate public puzzle IDs within one Event are rejected'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      '',
      'Blank ID',
      '[]'::jsonb
    )
  $$,
  '23514',
  null,
  'blank public puzzle IDs are rejected'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      'Invalid ID',
      'Invalid ID',
      '[]'::jsonb
    )
  $$,
  '23514',
  null,
  'malformed public puzzle IDs are rejected'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      repeat('a', 101),
      'Long ID',
      '[]'::jsonb
    )
  $$,
  '23514',
  null,
  'overlong public puzzle IDs are rejected'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      'blank-title',
      '   ',
      '[]'::jsonb
    )
  $$,
  '23514',
  null,
  'blank Connections puzzle titles are rejected'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      'long-title',
      repeat('a', 201),
      '[]'::jsonb
    )
  $$,
  '23514',
  null,
  'overlong Connections puzzle titles are rejected'
);

select throws_ok(
  $$
    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000001',
      'object-groups',
      'Object Groups',
      '{}'::jsonb
    )
  $$,
  '23514',
  null,
  'Connections groups must be stored as an array'
);

select is(
  (
    select count(*)
    from public.connections_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id = 'development-puzzle'
      and title = 'Development Puzzle'
  ),
  1::bigint,
  'the current Event has the seeded production Connections puzzle'
);

select is(
  (
    select count(*)
    from public.connections_puzzles
    where event_id = '00000000-0000-4000-8000-000000000002'
      and public_id = 'development-puzzle'
  ),
  0::bigint,
  'the isolation Event does not receive current wedding content'
);

select lives_ok(
  $$
    insert into public.events (id, slug)
    values ('00000000-0000-4000-8000-000000000003', 'cascade-test');

    insert into public.connections_puzzles (event_id, public_id, title, groups)
    values (
      '00000000-0000-4000-8000-000000000003',
      'cascade-puzzle',
      'Cascade Puzzle',
      '[]'::jsonb
    );

    delete from public.events
    where id = '00000000-0000-4000-8000-000000000003';
  $$,
  'an Event with only Connections content can be deleted'
);

select is(
  (
    select count(*)
    from public.connections_puzzles
    where event_id = '00000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'deleting an Event cascades to its Connections puzzles'
);

select * from finish();

rollback;
