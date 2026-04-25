-- ——————————————————————————————————————————————————
-- Migration 001 — expand the list of allowed generation tools
--
-- Run this in your Supabase SQL Editor on the LIVE database.
-- Only needed if you ran the original schema before this migration.
-- ——————————————————————————————————————————————————

-- Drop the old constraint
alter table generations drop constraint if exists generations_tool_check;

-- Add the new one with the expanded tool list
alter table generations add constraint generations_tool_check
  check (tool in (
    'obit_traditional','obit_celebratory','obit_personal',
    'eulogy','death_notice','memorial_card','order_of_service',
    'memorial_program','service_timeline','reading_music_suggestions',
    'thank_yous','acknowledgment_letter','grief_resources',
    'slideshow','program'
  ));
