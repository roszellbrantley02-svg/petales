-- ──────────────────────────────────────────────────────────────
-- Migration 013 — funeral home branding fields.
--
-- Each funeral home brings their own brand to the customer-facing
-- surfaces: their logo appears on family pages and print artifacts,
-- their accent color tints CTAs and dividers, their tagline shows
-- alongside our standard product copy.
--
-- HOW TO RUN: paste into Supabase SQL Editor and click Run.
-- ──────────────────────────────────────────────────────────────

alter table funeral_homes
  add column if not exists logo_url text,
  add column if not exists brand_color text,
  add column if not exists tagline text;
