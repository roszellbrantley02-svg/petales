-- ──────────────────────────────────────────────────────────────
-- Migration 011 — add tradition + language columns to generations.
--
-- Without these, the cache lookup couldn't distinguish an obituary
-- generated in English from one generated in Spanish (same tool, same
-- archive). We need them to enforce server-side cache by variant.
--
-- HOW TO RUN: paste into Supabase SQL Editor and click Run.
-- ──────────────────────────────────────────────────────────────

alter table generations
  add column if not exists tradition text default 'none',
  add column if not exists language text default 'en';

-- Backfill any existing rows that have nulls
update generations
set tradition = 'none' where tradition is null;
update generations
set language = 'en' where language is null;

-- Index to make the cache lookup fast
create index if not exists idx_generations_archive_tool_variant
  on generations(archive_id, tool, tradition, language, created_at desc);
