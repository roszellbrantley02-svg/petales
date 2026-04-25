import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import ThankYouCardsClient from './ThankYouCardsClient';
import type { Archive, Memory } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thank-you cards · Petales' };

export default async function ThankYouCardsPage({
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

  const { data: memories } = await admin
    .from('memories')
    .select('id, author_name, author_email, memory_type, text_content, caption, created_at')
    .eq('archive_id', archive.id)
    .order('created_at', { ascending: true });

  // Distinct contributors with their first contribution
  const seen = new Set<string>();
  const contributors: { name: string; email: string | null; sample: string | null }[] = [];
  for (const m of (memories || []) as Memory[]) {
    const key = (m.author_name || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let sample: string | null = null;
    if (m.memory_type === 'text' && m.text_content) {
      sample = m.text_content.split('.')[0]?.trim().slice(0, 120) || null;
    } else if (m.caption) {
      sample = m.caption;
    }
    contributors.push({
      name: m.author_name || '',
      email: m.author_email || null,
      sample,
    });
  }

  return (
    <ThankYouCardsClient
      archive={archive as Archive}
      contributors={contributors}
    />
  );
}
