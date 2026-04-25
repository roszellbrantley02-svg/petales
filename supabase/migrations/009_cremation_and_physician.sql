-- ──────────────────────────────────────────────────────────────
-- Migration 009 — add Cremation Memorial SKU fields and Physician
-- contact + reminder tracking to archives.
--
-- service_type           Marks the case as traditional vs cremation vs
--                        direct_cremation (or memorial-only). Used for
--                        UI/copy variations and for the cremation
--                        memorial SKU positioning.
-- package_price_cents    Optional. Lets the home record what the family
--                        paid for the memorial archive add-on.
-- package_price_label    Optional. Human-readable label (e.g. "Memorial
--                        Archive Package - $300").
-- physician_*            For the Physician Nudge feature: who to email
--                        for cause-of-death certification, and whether
--                        we've already nudged them.
--
-- HOW TO RUN: paste this into Supabase SQL Editor and click Run.
-- ──────────────────────────────────────────────────────────────

alter table archives
  add column if not exists service_type text default 'traditional',
  add column if not exists package_price_cents integer,
  add column if not exists package_price_label text,
  add column if not exists physician_name text,
  add column if not exists physician_email text,
  add column if not exists physician_reminded_at timestamptz,
  add column if not exists physician_reminded_count integer default 0;

-- Enforce service_type values
alter table archives
  drop constraint if exists archives_service_type_check;
alter table archives
  add constraint archives_service_type_check
  check (service_type in ('traditional', 'cremation', 'direct_cremation', 'memorial_only'));
