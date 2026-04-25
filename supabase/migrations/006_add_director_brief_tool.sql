-- ──────────────────────────────────────────────────────────────
-- Migration 006 — add 'director_brief' to the allowed generation tools.
--
-- The director_brief is a staff-only AI generation that produces a
-- one-page pre-meeting summary of the deceased, generated from family
-- contributions. The director reads it before the arrangement conference.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. SQL Editor → New query
--   3. Paste this file
--   4. Run
-- ──────────────────────────────────────────────────────────────

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
    -- Internal staff tools
    'director_brief',
    -- Legacy (still supported)
    'slideshow', 'program'
  ));
