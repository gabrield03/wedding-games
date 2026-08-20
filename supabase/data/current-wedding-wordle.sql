do $$
declare
  current_event_id uuid;
begin
  select id
  into current_event_id
  from public.events
  where slug = 'current-wedding';

  if current_event_id is null then
    raise exception 'Cannot load current wedding Wordle content: Event "current-wedding" does not exist.';
  end if;

  insert into public.wordle_puzzles (event_id, public_id, answer)
  values
    (current_event_id, 'wedding-01', 'BRIDE'),
    (current_event_id, 'wedding-02', 'GROOM'),
    (current_event_id, 'wedding-03', 'AISLE'),
    (current_event_id, 'wedding-04', 'RINGS'),
    (current_event_id, 'wedding-05', 'DANCE'),
    (current_event_id, 'wedding-06', 'TOAST'),
    (current_event_id, 'wedding-07', 'HEART'),
    (current_event_id, 'wedding-08', 'PARTY'),
    (current_event_id, 'wedding-09', 'ALTAR'),
    (current_event_id, 'wedding-10', 'HONEY')
  on conflict (event_id, public_id)
  do update set answer = excluded.answer;
end
$$;
