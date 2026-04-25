import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import PosterClient from './PosterClient';
import type { Archive, Memory } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Memorial poster · Petales' };

export default async function PosterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const admin = supabaseAdmin();
  const { data: archive } = await admin
    .from('archives')
    .select('*')
    .eq('share_slug', slug)
    .single();
  if (!archive) notFound();
  if (archive.home_id !== authed.home.id) notFound();

  // Pull text contributions to suggest a quote for the poster
  const { data: memories } = await admin
    .from('memories')
    .select('id, author_name, memory_type, text_content, is_last_words, created_at')
    .eq('archive_id', archive.id)
    .order('created_at', { ascending: true });

  return (
    <PosterClient
      archive={archive as Archive}
      memories={(memories || []) as Memory[]}
    />
  );
}
