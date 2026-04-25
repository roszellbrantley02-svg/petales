import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import FinalsClient from './FinalsClient';
import type { Archive } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Finals · Petales' };

export default async function FinalsPage({
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

  // Pull all generations that have an edited_content (these are the "finals")
  const { data: gens } = await admin
    .from('generations')
    .select('id, tool, content, edited_content, status, created_at, tradition, language')
    .eq('archive_id', archive.id)
    .not('edited_content', 'is', null)
    .order('created_at', { ascending: false });

  return (
    <FinalsClient
      archive={archive as Archive}
      finals={(gens || []) as Array<{
        id: string;
        tool: string;
        content: string | null;
        edited_content: string;
        status: string;
        created_at: string;
        tradition: string | null;
        language: string | null;
      }>}
    />
  );
}
