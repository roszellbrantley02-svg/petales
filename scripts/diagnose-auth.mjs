// ──────────────────────────────────────────────────────────────
// diagnose-auth.mjs — pinpoint why sign-in/sign-up isn't working
//
// Run from the app directory:
//   node scripts/diagnose-auth.mjs
//
// Reads .env.local automatically. No data is written that you
// can't roll back: the test user it creates is deleted at the end.
// ──────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ---------- 1. load .env.local manually (no dotenv dep needed) ----------
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found. Run from the app/ directory.');
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, '');
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CHECK 1 — Env vars loaded?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  NEXT_PUBLIC_SUPABASE_URL      :', URL ? '✓ ' + URL : '❌ MISSING');
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY :', ANON ? '✓ (' + ANON.slice(0, 20) + '…)' : '❌ MISSING');
console.log('  SUPABASE_SERVICE_ROLE_KEY     :', SERVICE ? '✓ (' + SERVICE.slice(0, 20) + '…)' : '❌ MISSING');
if (!URL || !ANON || !SERVICE) {
  console.error('\n❌ At least one env var is missing locally. Fix .env.local first.');
  process.exit(1);
}

// ---------- 2. check tables exist ----------
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CHECK 2 — Do the required tables exist in Supabase?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const tables = ['funeral_homes', 'staff', 'archives'];
for (const t of tables) {
  const { error } = await admin.from(t).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`  ${t.padEnd(20)} ❌ ${error.message}`);
  } else {
    console.log(`  ${t.padEnd(20)} ✓ exists`);
  }
}

// ---------- 3. try a real signup against Supabase auth ----------
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CHECK 3 — Can we actually create + sign in a test user?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// Use admin API to create a PRE-CONFIRMED user. This bypasses
// Supabase's email rate limit and email-confirmation requirement,
// proving whether sign-in itself works once a real user exists.
const testEmail = `roszellbrantley02+petalesdiag${Date.now()}@gmail.com`;
const testPassword = 'DiagnoseTest123!';

const { data: createData, error: createErr } = await admin.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
});

if (createErr) {
  console.log(`  admin createUser      ❌ ${createErr.message}`);
} else {
  console.log(`  admin createUser      ✓ user id ${createData.user?.id?.slice(0, 8)}…`);
}

const anon = createClient(URL, ANON);
const { error: signInErr } = await anon.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
});
if (signInErr) {
  console.log(`  signInWithPassword    ❌ ${signInErr.message}`);
} else {
  console.log(`  signInWithPassword    ✓ password login works`);
}

// Clean up
if (createData?.user?.id) {
  await admin.auth.admin.deleteUser(createData.user.id);
  console.log(`  cleanup               ✓ deleted test user`);
}

// Also report the email-confirmation setting situation
console.log(`\n  ⚠  Earlier "email rate limit exceeded" means email confirmation`);
console.log(`     is currently ENABLED on your Supabase project, and you've hit`);
console.log(`     the 4-emails-per-hour default limit from prior signup attempts.`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('INTERPRETATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• Tables missing  → run supabase/schema.sql in Supabase SQL editor');
console.log('• signUp fails    → Supabase project misconfigured (auth disabled?)');
console.log('• signIn fails with "Email not confirmed"');
console.log('     → Supabase Dashboard → Authentication → Providers → Email');
console.log('       → turn OFF "Confirm email" (or set up email templates)');
console.log('• All ✓ locally but deployed app still broken');
console.log('     → env vars missing on Vercel. Vercel Project → Settings →');
console.log('       Environment Variables → add all three from .env.local,');
console.log('       then redeploy.');
