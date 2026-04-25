// Family view — /p/[slug]
// This is the page family members visit to add memories.

import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import FamilyArchiveClient from './FamilyArchiveClient';
import type { Archive, Memory } from '@/lib/types';

export default async function FamilyArchivePage({
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

  if (!archive) {
    notFound();
  }

  // Pull funeral home branding (logo, color, tagline) so the family page
  // shows the home's brand alongside Petales — they get more visibility
  // than we do, which is intentional.
  let homeBranding: { name: string; logo_url: string | null; brand_color: string | null; tagline: string | null } | null = null;
  if (archive.home_id) {
    const { data: home } = await admin
      .from('funeral_homes')
      .select('name, logo_url, brand_color, tagline')
      .eq('id', archive.home_id)
      .single();
    if (home) {
      homeBranding = {
        name: home.name,
        logo_url: home.logo_url || null,
        brand_color: home.brand_color || null,
        tagline: home.tagline || null,
      };
    }
  }

  const { data: memories } = await admin
    .from('memories')
    .select('*')
    .eq('archive_id', archive.id)
    .order('created_at', { ascending: false });

  return (
    <FamilyArchiveClient
      archive={archive as Archive}
      initialMemories={(memories || []) as Memory[]}
      homeBranding={homeBranding}
    />
  );
}
