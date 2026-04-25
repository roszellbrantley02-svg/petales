-- ——————————————————————————————————————————————————
-- Migration 003 — Family announcement broadcaster
-- Adds tables for tracking announcements sent to a family's
-- contributors via Resend, plus per-recipient delivery status.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. SQL Editor → New query
--   3. Paste this entire file
--   4. Run
--   5. Should see "Success. No rows returned."
-- ——————————————————————————————————————————————————

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

-- RLS — staff at the home that owns the archive can manage its announcements
alter table announcements enable row level security;
alter table announcement_deliveries enable row level security;

drop policy if exists "Staff can manage their archive's announcements" on announcements;
create policy "Staff can manage their archive's announcements" on announcements
  for all using (
    archive_id in (
      select a.id from archives a
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Staff can view their archive's deliveries" on announcement_deliveries;
create policy "Staff can view their archive's deliveries" on announcement_deliveries
  for select using (
    announcement_id in (
      select an.id from announcements an
      join archives a on a.id = an.archive_id
      join staff s on s.home_id = a.home_id
      where s.auth_user_id = auth.uid()
    )
  );
