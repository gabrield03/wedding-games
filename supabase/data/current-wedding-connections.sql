do $$
declare
  current_event_id uuid;
begin
  select id
  into current_event_id
  from public.events
  where slug = 'current-wedding';

  if current_event_id is null then
    raise exception 'Cannot load current wedding Connections content: Event "current-wedding" does not exist.';
  end if;

  insert into public.connections_puzzles (
    event_id,
    public_id,
    title,
    groups
  )
  values (
    current_event_id,
    'development-puzzle',
    'Development Puzzle',
    '[
      {
        "id": "group-cake",
        "category": "Types of cake",
        "tiles": [
          { "id": "letter-a", "label": "pound" },
          { "id": "letter-b", "label": "cheese" },
          { "id": "letter-c", "label": "coffee" },
          { "id": "letter-d", "label": "crab" }
        ]
      },
      {
        "id": "group-cats",
        "category": "Types of cats",
        "tiles": [
          { "id": "number-1", "label": "tuxedo" },
          { "id": "number-2", "label": "calico" },
          { "id": "number-3", "label": "tabi" },
          { "id": "number-4", "label": "siamese" }
        ]
      },
      {
        "id": "group-things-that-ring",
        "category": "Things that ring",
        "tiles": [
          { "id": "symbol-exclamation", "label": "saturn" },
          { "id": "symbol-at", "label": "boxing" },
          { "id": "symbol-hash", "label": "doorbell" },
          { "id": "symbol-dollar", "label": "telephone" }
        ]
      },
      {
        "id": "group-contains-bow",
        "category": "Contains bow",
        "tiles": [
          { "id": "animal-cat", "label": "rainbow" },
          { "id": "animal-cow", "label": "crossbow" },
          { "id": "animal-dog", "label": "elbow" },
          { "id": "animal-moose", "label": "bowtie" }
        ]
      }
    ]'::jsonb
  )
  on conflict (event_id, public_id)
  do update set
    title = excluded.title,
    groups = excluded.groups;
end
$$;
