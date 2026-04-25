import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import ProgramClient from './ProgramClient';
import type { Archive } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Memorial program · Petales' };

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const admin = supabaseAdmin();

  // Load the archive (must belong to the staff's home)
  const { data: archive } = await admin
    .from('archives')
    .select('*')
    .eq('share_slug', slug)
    .single();

  if (!archive) notFound();
  if (archive.home_id !== authed.home.id) notFound();

  // Load all generations and pick the most recent of each tool
  const { data: gens } = await admin
    .from('generations')
    .select('tool, content, created_at, tradition, language')
    .eq('archive_id', archive.id)
    .order('created_at', { ascending: false });

  const latest: Record<string, string> = {};
  for (const g of gens || []) {
    if (!latest[g.tool] && g.content) latest[g.tool] = g.content;
  }

  return (
    <ProgramClient
      archive={archive as Archive}
      homeName={authed.home.name}
      latest={latest}
    />
  );
}
