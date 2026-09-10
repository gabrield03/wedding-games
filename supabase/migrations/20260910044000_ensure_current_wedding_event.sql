insert into public.events (id, slug)
values ('00000000-0000-4000-8000-000000000001', 'current-wedding')
on conflict (slug) do nothing;
