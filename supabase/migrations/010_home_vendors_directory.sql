-- ──────────────────────────────────────────────────────────────
-- Migration 010 — home-level vendor directory.
--
-- Funeral homes have regular vendors they work with (their preferred
-- florist, the clergy in their area, the catering company, etc.).
-- Instead of typing these from scratch on every case, we store them
-- once at the home level and let the director quick-pick when adding
-- vendors to a specific case.
--
-- Per-case vendors (the existing `vendors` table) gain an optional
-- home_vendor_id link so we can track which directory entries are
-- being used and how often.
--
-- HOW TO RUN: paste into Supabase SQL Editor and click Run.
-- ──────────────────────────────────────────────────────────────

create table if not exists home_vendors (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid not null references funeral_homes(id) on delete cascade,
  vendor_type text not null check (vendor_type in (
    'florist','clergy','musician','caterer','transportation',
    'cemetery','photographer','reception_venue','pallbearer','other'
  )),
  name text not null,
  contact_email text,
  contact_phone text,
  notes text,
  is_preferred boolean default false,
  use_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_home_vendors_home on home_vendors(home_id);
create index if not exists idx_home_vendors_type on home_vendors(home_id, vendor_type);
create index if not exists idx_home_vendors_preferred
  on home_vendors(home_id, vendor_type) where is_preferred = true;

-- Auto-update updated_at on changes (re-uses the trigger function from migration 002 if present)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'touch_home_vendor_updated_at') then
    create function touch_home_vendor_updated_at()
    returns trigger as $body$
    begin
      new.updated_at = now();
      return new;
    end;
    $body$ language plpgsql;
  end if;
end$$;

drop trigger if exists trg_home_vendors_touch on home_vendors;
create trigger trg_home_vendors_touch
  before update on home_vendors
  for each row execute function touch_home_vendor_updated_at();

-- Link per-case vendors back to their directory entry (optional)
alter table vendors
  add column if not exists home_vendor_id uuid references home_vendors(id) on delete set null;

create index if not exists idx_vendors_home_vendor on vendors(home_vendor_id);

-- RLS: staff can manage vendors for their own home
alter table home_vendors enable row level security;
drop policy if exists "Staff can manage their home's vendors" on home_vendors;
create policy "Staff can manage their home's vendors" on home_vendors
  for all using (
    home_id in (select home_id from staff where auth_user_id = auth.uid())
  );
