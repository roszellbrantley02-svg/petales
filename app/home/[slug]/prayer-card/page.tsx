import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import PrayerCardClient from './PrayerCardClient';
import type { Archive } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Prayer cards · Petales' };

export default async function PrayerCardPage({
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

  return <PrayerCardClient archive={archive as Archive} />;
}
