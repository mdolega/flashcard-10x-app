-- migration: add srs fields to public.flashcards and supporting index
-- purpose: introduce spaced repetition (sm-2) metadata to schedule reviews
-- affected: table public.flashcards
-- details:
--   - add columns: next_review_at, last_review_at, repetition, interval_days, easiness, lapses
--   - create a partial index to speed up due queries per user
-- security:
--   - rls remains enabled on public.flashcards; existing ownership-by-user policies continue to apply
--   - no destructive operations; all columns are added with sane defaults
-- notes:
--   - easiness is stored as numeric(3,2) with default 2.50 per SM-2 defaults
--   - repetition and interval_days start at 0; next_review_at defaults to now()

begin;

alter table if exists public.flashcards
  add column if not exists next_review_at timestamptz not null default now(),
  add column if not exists last_review_at timestamptz,
  add column if not exists repetition integer not null default 0,
  add column if not exists interval_days integer not null default 0,
  add column if not exists easiness numeric(3,2) not null default 2.50,
  add column if not exists lapses integer not null default 0;

-- index optimized for listing due cards of a user; only non-deleted rows are considered
create index if not exists flashcards_due_idx
  on public.flashcards (user_id, next_review_at)
  where deleted_at is null;

commit;


