-- ——————————————————————————————————————————————————
-- Migration 005 — Theme, Wall, Candles
--
-- Adds:
--   1. theme column on archives (color palette family picked)
--   2. wall_notes table — short messages family/friends leave
--   3. candles table — virtual candles lit in remembrance
--
-- HOW TO RUN:
--   Supabase dashboard → SQL Editor → paste this → Run
-- ——————————————————————————————————————————————————

-- 1. Theme on archives
alter table archives add column if not exists theme text default 'cream';

-- 2. Wall (short messages, like a guestbook)
create table if not exists wall_notes (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  author_name text,
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_wall_notes_archive on wall_notes(archive_id, created_at desc);

-- 3. Candles (one click = one candle)
create table if not exists candles (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  lit_by text,
  dedication text,
  created_at timestamptz default now()
);

create index if not exists idx_candles_archive on candles(archive_id, created_at desc);

-- RLS
alter table wall_notes enable row level security;
alter table candles enable row level security;

drop policy if exists "Anyone can leave a wall note" on wall_notes;
create policy "Anyone can leave a wall note" on wall_notes
  for insert with check (true);

drop policy if exists "Anyone can read wall notes" on wall_notes;
create policy "Anyone can read wall notes" on wall_notes
  for select using (true);

drop policy if exists "Anyone can light a candle" on candles;
create policy "Anyone can light a candle" on candles
  for insert with check (true);

drop policy if exists "Anyone can see candles" on candles;
create policy "Anyone can see candles" on candles
  for select using (true);
