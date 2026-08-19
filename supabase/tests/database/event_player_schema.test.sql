begin;

select plan(23);

select has_table('public', 'events', 'events table exists');
select has_table('public', 'players', 'players table exists');

select has_column('public', 'events', 'id', 'events.id exists');
select has_column('public', 'events', 'slug', 'events.slug exists');
select has_column(
  'public',
  'events',
  'created_at',
  'events.created_at exists'
);
select has_column('public', 'players', 'id', 'players.id exists');
select has_column(
  'public',
  'players',
  'event_id',
  'players.event_id exists'
);
select has_column(
  'public',
  'players',
  'auth_user_id',
  'players.auth_user_id exists'
);
select has_column(
  'public',
  'players',
  'created_at',
  'players.created_at exists'
);

select col_is_pk('public', 'events', 'id', 'events.id is the primary key');
select col_is_pk('public', 'players', 'id', 'players.id is the primary key');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_slug_unique'
      and contype = 'u'
  ),
  'events.slug has a unique constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_slug_format'
      and contype = 'c'
  ),
  'events.slug has a format constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_event_id_fkey'
      and contype = 'f'
      and confrelid = 'public.events'::regclass
      and confdeltype = 'r'
  ),
  'players.event_id references events with delete restricted'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_auth_user_id_fkey'
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ),
  'players.auth_user_id references auth.users with delete cascade'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_event_id_auth_user_id_unique'
      and contype = 'u'
  ),
  'players are unique by Event and Auth user'
);

select throws_ok(
  $$
    insert into public.events (slug)
    values ('current-wedding')
  $$,
  '23505',
  null,
  'duplicate Event slugs are rejected'
);

select throws_ok(
  $$
    insert into public.events (slug)
    values ('Invalid Slug')
  $$,
  '23514',
  null,
  'invalid Event slugs are rejected'
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
  '10000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
  '{}'::jsonb,
  true
);

select lives_ok(
  $$
    insert into public.players (event_id, auth_user_id)
    values
      (
        '00000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001'
      ),
      (
        '00000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001'
      )
  $$,
  'one Auth identity can participate in two Events'
);

select is(
  (
    select count(*)
    from public.players
    where auth_user_id = '10000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'the Auth identity has one Player in each Event'
);

select throws_ok(
  $$
    insert into public.players (event_id, auth_user_id)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23505',
  null,
  'duplicate Players within one Event are rejected'
);

select throws_ok(
  $$
    delete from public.events
    where id = '00000000-0000-4000-8000-000000000002'
  $$,
  '23503',
  null,
  'an Event with Players cannot be deleted'
);

delete from auth.users
where id = '10000000-0000-4000-8000-000000000001';

select is(
  (
    select count(*)
    from public.players
    where auth_user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'deleting an Auth user cascades to their Player rows'
);

select * from finish();

rollback;
