-- ──────────────────────────────────────────────────────────────
-- Migration 012 — add print supplier fields to funeral_homes.
--
-- Funeral homes already have relationships with print suppliers (Frazer,
-- Aurora, MKJ Marketing, local shops, etc.). Instead of forcing them to
-- abandon those relationships, we let them store the supplier's contact
-- and offer a one-click "Send to [supplier]" button on every print
-- artifact page.
--
-- HOW TO RUN: paste into Supabase SQL Editor and click Run.
-- ──────────────────────────────────────────────────────────────

alter table funeral_homes
  add column if not exists print_supplier_name text,
  add column if not exists print_supplier_email text,
  add column if not exists print_supplier_notes text;
