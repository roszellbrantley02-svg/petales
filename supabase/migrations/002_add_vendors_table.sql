-- ——————————————————————————————————————————————————
-- Migration 002 — Vendor coordination tracker
-- Adds the vendors table for tracking florist, clergy,
-- musician, caterer, and other service vendors per archive.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. SQL Editor → New query
--   3. Paste this entire file
--   4. Run
--   5. Should see "Success. No rows returned."
--
-- Safe to re-run; uses CREATE TABLE IF NOT EXISTS.
-- ——————————————————————————————————————————————————

create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  vendor_type text check (vendor_type in (
    'florist','clergy','musician','caterer','transportation',
    'cemetery','photographer','reception_venue','pallbearer','other'
  )) not null,
  name text not null,
  contact_email text,
  contact_phone text,
  status text check (status in (
    'not_contacted','contacted','confirmed','completed','cancelled'
  )) default 'not_contacted',
  notes text,
  needed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vendors_archive on vendors(archive_id);
create index if not exists idx_vendors_status on vendors(status);

-- Auto-update vendors.updated_at on changes
create or replace function touch_vendor_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vendors_updated_at on vendors;
create trigger vendors_updated_at
  before update on vendors
  for each row execute function touch_vendor_updated_at();

-- RLS — staff at the home that owns the archive can manage its vendors
alter table vendors enable row level security;

drop policy if exists "Staff can manage their archive's vendors" on vendors;
create policy "Staff can manage their archive's vendors" on vendors
  for all using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );
