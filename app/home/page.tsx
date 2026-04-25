// Funeral home console — /home
// Dashboard of all family archives belonging to the SIGNED-IN staff's home.

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConsoleDashboardClient from './ConsoleDashboardClient';
import type { Archive } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ConsoleDashboardPage() {
  const authed = await getAuthedStaff();

  // Middleware should have caught unauthenticated, but double-check
  if (!authed) {
    redirect('/signin');
  }

  const admin = supabaseAdmin();

  const { data: archives } = await admin
    .from('archives')
    .select('*, memories(id, author_name, memory_type)')
    .eq('home_id', authed.home.id)
    .order('updated_at', { ascending: false });

  // Summarize each archive
  const summarized = (archives || []).map((a: Archive & { memories?: { author_name: string; memory_type: string }[] }) => {
    const mems = a.memories || [];
    const contributors = new Set(mems.map(m => (m.author_name || '').toLowerCase())).size;
    return {
      ...a,
      memory_count: mems.length,
      contributor_count: contributors,
    };
  });

  return (
    <ConsoleDashboardClient
      initialArchives={summarized}
      homeName={authed.home.name}
      staffName={authed.staff.name || authed.staff.email}
    />
  );
}
