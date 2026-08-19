begin;

select plan(11);

select ok(
  not has_table_privilege('anon', 'public.players', 'select'),
  'anon cannot select Players'
);
select ok(
  not has_table_privilege('anon', 'public.events', 'select'),
  'anon cannot select Events'
);
select ok(
  has_table_privilege('authenticated', 'public.players', 'select'),
  'authenticated users have Player select privilege'
);
select ok(
  not has_table_privilege('authenticated', 'public.players', 'insert'),
  'authenticated users cannot insert Players'
);
select ok(
  not has_table_privilege('authenticated', 'public.events', 'select'),
  'authenticated users cannot select Events'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.events'::regclass
  ),
  'RLS is enabled on Events'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.players'::regclass
  ),
  'RLS is enabled on Players'
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
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
    '{}'::jsonb,
    true
  );

insert into public.players (id, event_id, auth_user_id)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.players),
  1::bigint,
  'an authenticated user can select only their own Player'
);
select is(
  (
    select count(*)
    from public.players
    where id = '30000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'knowing another Player ID does not bypass RLS'
);
select is(
  (
    select count(*)
    from public.players
    where event_id = '00000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'a Player in another Event remains hidden'
);

select throws_ok(
  $$
    insert into public.players (event_id, auth_user_id)
    values (
      '00000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'authenticated direct Player insertion is denied'
);

reset role;

select * from finish();

rollback;
