-- ——————————————————————————————————————————————————
-- Migration 004 — Affiliate marketplace
--
-- Adds:
--   1. donation fields to archives (family's chosen charity)
--   2. marketplace_clicks table for tracking outbound clicks
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. SQL Editor → New query
--   3. Paste this entire file
--   4. Run
-- ——————————————————————————————————————————————————

-- 1. Donation fields on archives
alter table archives add column if not exists donation_charity_name text;
alter table archives add column if not exists donation_url text;
alter table archives add column if not exists donation_note text;

-- 2. Click tracking
create table if not exists marketplace_clicks (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  item_id text not null,
  category text,
  vendor text,
  destination_url text,
  referrer text,
  user_agent text,
  ip_hash text,  -- Hashed for privacy, not raw IP
  created_at timestamptz default now()
);

create index if not exists idx_marketplace_clicks_archive on marketplace_clicks(archive_id, created_at desc);
create index if not exists idx_marketplace_clicks_item on marketplace_clicks(item_id);
create index if not exists idx_marketplace_clicks_category on marketplace_clicks(category);

-- RLS: clicks are insertable by anyone (they happen from family-facing pages)
-- but only the home's staff can read them
alter table marketplace_clicks enable row level security;

drop policy if exists "Anyone can log a marketplace click" on marketplace_clicks;
create policy "Anyone can log a marketplace click" on marketplace_clicks
  for insert with check (true);

drop policy if exists "Staff can read their archive's clicks" on marketplace_clicks;
create policy "Staff can read their archive's clicks" on marketplace_clicks
  for select using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );
