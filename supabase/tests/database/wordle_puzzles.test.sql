begin;

select plan(32);

select has_table('public', 'wordle_puzzles', 'wordle_puzzles table exists');

select has_column(
  'public',
  'wordle_puzzles',
  'id',
  'wordle_puzzles.id exists'
);
select has_column(
  'public',
  'wordle_puzzles',
  'event_id',
  'wordle_puzzles.event_id exists'
);
select has_column(
  'public',
  'wordle_puzzles',
  'public_id',
  'wordle_puzzles.public_id exists'
);
select has_column(
  'public',
  'wordle_puzzles',
  'answer',
  'wordle_puzzles.answer exists'
);
select has_column(
  'public',
  'wordle_puzzles',
  'created_at',
  'wordle_puzzles.created_at exists'
);

select col_is_pk(
  'public',
  'wordle_puzzles',
  'id',
  'wordle_puzzles.id is the primary key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_puzzles'::regclass
      and conname = 'wordle_puzzles_event_id_public_id_unique'
      and contype = 'u'
  ),
  'Wordle public IDs are unique within an Event'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_puzzles'::regclass
      and conname = 'wordle_puzzles_event_id_fkey'
      and contype = 'f'
      and confrelid = 'public.events'::regclass
      and confdeltype = 'c'
  ),
  'Wordle puzzles belong to an Event with delete cascade'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_puzzles'::regclass
      and conname = 'wordle_puzzles_public_id_format'
      and contype = 'c'
  ),
  'Wordle public IDs have a format constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.wordle_puzzles'::regclass
      and conname = 'wordle_puzzles_answer_format'
      and contype = 'c'
  ),
  'Wordle answers have a canonical format constraint'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.wordle_puzzles'::regclass
  ),
  'RLS is enabled on Wordle puzzles'
);

select ok(
  not has_table_privilege('anon', 'public.wordle_puzzles', 'select'),
  'anon cannot select Wordle puzzles'
);
select ok(
  not has_table_privilege('authenticated', 'public.wordle_puzzles', 'select'),
  'authenticated users cannot select Wordle puzzles'
);
select ok(
  has_table_privilege('service_role', 'public.wordle_puzzles', 'select'),
  'service role can select Wordle puzzles'
);
select ok(
  not has_table_privilege('service_role', 'public.wordle_puzzles', 'insert'),
  'service role cannot insert Wordle puzzles'
);
select ok(
  not has_table_privilege('service_role', 'public.wordle_puzzles', 'update'),
  'service role cannot update Wordle puzzles'
);
select ok(
  not has_table_privilege('service_role', 'public.wordle_puzzles', 'delete'),
  'service role cannot delete Wordle puzzles'
);

select lives_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values
      (
        '00000000-0000-4000-8000-000000000001',
        'shared-wordle-puzzle',
        'CRANE'
      ),
      (
        '00000000-0000-4000-8000-000000000002',
        'shared-wordle-puzzle',
        'APPLE'
      )
  $$,
  'the same Wordle public ID may exist in different Events'
);

select is(
  (
    select count(*)
    from public.wordle_puzzles
    where public_id = 'shared-wordle-puzzle'
  ),
  2::bigint,
  'event-scoped Wordle copies are stored separately'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      'shared-wordle-puzzle',
      'HEART'
    )
  $$,
  '23505',
  null,
  'duplicate Wordle public IDs within one Event are rejected'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      '',
      'CRANE'
    )
  $$,
  '23514',
  null,
  'blank Wordle public IDs are rejected'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      'Invalid ID',
      'CRANE'
    )
  $$,
  '23514',
  null,
  'malformed Wordle public IDs are rejected'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      repeat('a', 101),
      'CRANE'
    )
  $$,
  '23514',
  null,
  'overlong Wordle public IDs are rejected'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      'lowercase-answer',
      'crane'
    )
  $$,
  '23514',
  null,
  'lowercase Wordle answers are rejected'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      'short-answer',
      'FOUR'
    )
  $$,
  '23514',
  null,
  'Wordle answers with the wrong length are rejected'
);

select throws_ok(
  $$
    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000001',
      'numeric-answer',
      'AB1DE'
    )
  $$,
  '23514',
  null,
  'non-alphabetic Wordle answers are rejected'
);

select is(
  (
    select count(*)
    from public.wordle_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id like 'wedding-%'
  ),
  10::bigint,
  'the current Event has all ten production Wordle puzzles'
);

select is(
  (
    select string_agg(public_id || ':' || answer, ',' order by public_id)
    from public.wordle_puzzles
    where event_id = '00000000-0000-4000-8000-000000000001'
      and public_id like 'wedding-%'
  ),
  'wedding-01:BRIDE,wedding-02:GROOM,wedding-03:AISLE,wedding-04:RINGS,wedding-05:DANCE,wedding-06:TOAST,wedding-07:HEART,wedding-08:PARTY,wedding-09:ALTAR,wedding-10:HONEY',
  'the current Event Wordle content matches the production answer bank'
);

select is(
  (
    select count(*)
    from public.wordle_puzzles
    where event_id = '00000000-0000-4000-8000-000000000002'
      and public_id like 'wedding-%'
  ),
  0::bigint,
  'the isolation Event does not receive production Wordle content'
);

select lives_ok(
  $$
    insert into public.events (id, slug)
    values ('00000000-0000-4000-8000-000000000004', 'wordle-cascade-test');

    insert into public.wordle_puzzles (event_id, public_id, answer)
    values (
      '00000000-0000-4000-8000-000000000004',
      'cascade-wordle',
      'CRANE'
    );

    delete from public.events
    where id = '00000000-0000-4000-8000-000000000004';
  $$,
  'an Event with only Wordle content can be deleted'
);

select is(
  (
    select count(*)
    from public.wordle_puzzles
    where event_id = '00000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'deleting an Event cascades to its Wordle puzzles'
);

select * from finish();

rollback;
