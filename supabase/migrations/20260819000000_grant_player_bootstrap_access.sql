revoke all on table public.events from service_role;
revoke all on table public.players from service_role;

grant select on table public.events to service_role;
grant select, insert on table public.players to service_role;
