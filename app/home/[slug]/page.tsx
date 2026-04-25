// Console detail view — /home/[slug]
// One family's archive, with contributions list and AI generation tools.
// STAFF-ONLY: enforces that the signed-in staff owns this archive.

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import ConsoleDetailClient from './ConsoleDetailClient';
import type { Archive, Memory } from '@/lib/types';

export default async function ConsoleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Must be signed in (middleware should already have caught this for /home/*)
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const admin = supabaseAdmin();

  // 2. Look up the archive
  const { data: archive } = await admin
    .from('archives')
    .select('*')
    .eq('share_slug', slug)
    .single();

  if (!archive) notFound();

  // 3. Tenant check — refuse to render another home's archive in the staff console.
  // Use notFound() (not redirect) so we don't leak that the archive exists elsewhere.
  if (archive.home_id !== authed.home.id) notFound();

  const { data: memories } = await admin
    .from('memories')
    .select('*')
    .eq('archive_id', archive.id)
    .order('created_at', { ascending: true });

  return (
    <ConsoleDetailClient
      archive={archive as Archive}
      memories={(memories || []) as Memory[]}
    />
  );
}
