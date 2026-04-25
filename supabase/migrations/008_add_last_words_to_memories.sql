-- ──────────────────────────────────────────────────────────────
-- Migration 008 — add Last Words category to memories.
--
-- Last Words are a sacred sub-category in PHILOSOPHY.md: things the
-- deceased actually said, captured by family in voicemails, written in
-- cards, or remembered word-for-word. We mark these distinctly so the
-- archive UI can honor them in their own section.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. SQL Editor → New query
--   3. Paste this file
--   4. Run
-- ──────────────────────────────────────────────────────────────

alter table memories
  add column if not exists is_last_words boolean not null default false;

create index if not exists idx_memories_last_words
  on memories(archive_id) where is_last_words = true;
