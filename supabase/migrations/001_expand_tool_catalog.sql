-- ——————————————————————————————————————————————————
-- Migration 001 — Expand the generations.tool check constraint
-- to include the new AI tools added in this build.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. SQL Editor → New query
--   3. Paste this entire file
--   4. Run
--   5. Should see "Success. No rows returned."
--
-- This is safe to re-run. It drops the old constraint and recreates
-- a wider one. No data is altered or destroyed.
-- ——————————————————————————————————————————————————

alter table generations
  drop constraint if exists generations_tool_check;

alter table generations
  add constraint generations_tool_check
  check (tool in (
    -- Obituaries (tone)
    'obit_traditional', 'obit_celebratory', 'obit_personal',
    -- Service writing
    'eulogy', 'death_notice', 'memorial_card',
    'order_of_service', 'memorial_program', 'service_timeline',
    -- Suggestions
    'reading_music_suggestions',
    -- After-service
    'thank_yous', 'acknowledgment_letter', 'grief_resources',
    -- Legacy (still supported)
    'slideshow', 'program'
  ));
