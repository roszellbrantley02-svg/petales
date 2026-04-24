// Console detail view — /home/[slug]
// One family's archive, with contributions list and AI generation tools.

import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ConsoleDetailClient from './ConsoleDetailClient';
import type { Archive, Memory } from '@/lib/types';

export default async function ConsoleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = supabaseAdmin();

  const { data: archive } = await admin
    .from('archives')
    .select('*')
    .eq('share_slug', slug)
    .single();

  if (!archive) notFound();

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
