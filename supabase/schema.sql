-- ——————————————————————————————————————————————————
-- Momo — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- https://supabase.com/dashboard/project/_/sql
-- ——————————————————————————————————————————————————

-- Enable UUID generation if not already enabled
create extension if not exists "uuid-ossp";

-- ——— Funeral homes ———
create table if not exists funeral_homes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_email text,
  subscription_tier text check (subscription_tier in ('trial','independent','mid','high_volume','enterprise')) default 'trial',
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- ——— Staff accounts at a funeral home ———
create table if not exists staff (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references funeral_homes(id) on delete cascade,
  email text not null,
  name text,
  role text check (role in ('admin','director','staff')) default 'staff',
  auth_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(home_id, email)
);

-- ——— Archives (one per deceased person) ———
create table if not exists archives (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references funeral_homes(id) on delete cascade,
  subject_name text not null,
  subject_dates text,
  cover_photo_url text,
  share_slug text unique not null default substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 12),
  family_contact_email text,
  donation_charity_name text,
  donation_url text,
  donation_note text,
  status text check (status in ('active','completed','archived')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_archives_home on archives(home_id);
create index idx_archives_slug on archives(share_slug);
create index idx_archives_status on archives(status);

-- ——— Memories (stories, photos, voice, video) ———
create table if not exists memories (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  author_name text not null,
  author_email text,
  memory_type text check (memory_type in ('text','photo','video','voice')) not null,
  text_content text,
  media_url text,
  duration_seconds numeric,
  caption text,
  created_at timestamptz default now()
);

create index idx_memories_archive on memories(archive_id);
create index idx_memories_created on memories(archive_id, created_at desc);

-- ——— Generated outputs (obituary, eulogy, etc) ———
create table if not exists generations (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  generated_by uuid references staff(id) on delete set null,
  tool text check (tool in (
    'obit_traditional','obit_celebratory','obit_personal',
    'eulogy','death_notice','memorial_card','order_of_service',
    'memorial_program','service_timeline','reading_music_suggestions',
    'thank_yous','acknowledgment_letter','grief_resources',
    'slideshow','program'
  )) not null,
  content text,
  edited_content text,
  status text check (status in ('draft','edited','finalized')) default 'draft',
  created_at timestamptz default now()
);

create index idx_generations_archive on generations(archive_id, created_at desc);

-- ——— Vendors (florist, clergy, caterer, etc) ———
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

-- ——— Announcements (family broadcaster) ———
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  subject text not null,
  body text not null,
  status text check (status in ('draft','sending','sent','failed')) default 'draft',
  recipient_count int default 0,
  delivered_count int default 0,
  failed_count int default 0,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_announcements_archive on announcements(archive_id, created_at desc);

create table if not exists announcement_deliveries (
  id uuid primary key default uuid_generate_v4(),
  announcement_id uuid references announcements(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  delivery_status text check (delivery_status in ('pending','sent','failed','bounced')) default 'pending',
  resend_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_deliveries_announcement on announcement_deliveries(announcement_id);
create index if not exists idx_deliveries_status on announcement_deliveries(delivery_status);

-- ——— Marketplace clicks ———
create table if not exists marketplace_clicks (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  item_id text not null,
  category text,
  vendor text,
  destination_url text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz default now()
);

create index if not exists idx_marketplace_clicks_archive on marketplace_clicks(archive_id, created_at desc);
create index if not exists idx_marketplace_clicks_item on marketplace_clicks(item_id);

-- ——— Audit log ———
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references funeral_homes(id) on delete set null,
  actor_type text check (actor_type in ('staff','family','system')),
  actor_id text,
  action text,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ——— Auto-update updated_at on archives ———
create or replace function touch_archive_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists archives_updated_at on archives;
create trigger archives_updated_at
  before update on archives
  for each row execute function touch_archive_updated_at();

-- When a memory is added, bump the archive's updated_at
create or replace function touch_archive_on_memory()
returns trigger as $$
begin
  update archives set updated_at = now() where id = new.archive_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists memories_touch_archive on memories;
create trigger memories_touch_archive
  after insert on memories
  for each row execute function touch_archive_on_memory();

-- ——————————————————————————————————————————————————
-- Row Level Security
-- ——————————————————————————————————————————————————

alter table funeral_homes enable row level security;
alter table staff enable row level security;
alter table archives enable row level security;
alter table memories enable row level security;
alter table generations enable row level security;
alter table vendors enable row level security;
alter table announcements enable row level security;
alter table announcement_deliveries enable row level security;

create policy "Staff can manage their archive's vendors" on vendors
  for all using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );

create policy "Staff can manage their archive's announcements" on announcements
  for all using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );

create policy "Staff can view their archive's deliveries" on announcement_deliveries
  for select using (
    announcement_id in (
      select an.id from announcements an
      join archives a on a.id = an.archive_id
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );

-- Staff can read their own home's data
create policy "Staff can read their home" on funeral_homes
  for select using (
    id in (select home_id from staff where auth_user_id = auth.uid())
  );

create policy "Staff can read their colleagues" on staff
  for select using (
    home_id in (select home_id from staff where auth_user_id = auth.uid())
  );

create policy "Staff can read their home's archives" on archives
  for select using (
    home_id in (select home_id from staff where auth_user_id = auth.uid())
  );

create policy "Staff can modify their home's archives" on archives
  for all using (
    home_id in (select home_id from staff where auth_user_id = auth.uid())
  );

create policy "Staff can read memories for their archives" on memories
  for select using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );

create policy "Staff can read generations for their archives" on generations
  for all using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );

-- Family members (unauthenticated) can read/write memories via share_slug.
-- The API uses the service role key for family-side operations,
-- so RLS here is primarily for authenticated staff.

-- ——————————————————————————————————————————————————
-- Storage bucket for media (create via dashboard OR this command)
-- ——————————————————————————————————————————————————
-- In the Supabase dashboard, go to Storage → Create bucket:
--   Name: media
--   Public: true (for v1 — tighten later)
-- Or via SQL (uncomment):
-- insert into storage.buckets (id, name, public) values ('media', 'media', true);
