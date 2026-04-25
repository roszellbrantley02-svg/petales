import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import PhotoAlbumClient from './PhotoAlbumClient';
import type { Archive, Memory } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photo album · Petales' };

export default async function PhotoAlbumPage({
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
    .select('id, author_name, memory_type, media_url, caption, created_at')
    .eq('archive_id', archive.id)
    .eq('memory_type', 'photo')
    .order('created_at', { ascending: true });

  return (
    <PhotoAlbumClient
      archive={archive as Archive}
      photos={(memories || []) as Memory[]}
    />
  );
}
