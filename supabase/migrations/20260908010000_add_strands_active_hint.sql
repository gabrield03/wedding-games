alter table public.strands_attempts
add column active_hint_word text;

alter table public.strands_attempts
add constraint strands_attempts_active_hint_word_format check (
  active_hint_word is null
  or active_hint_word ~ '^[A-Z]{4,}$'
);
