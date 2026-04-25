import { redirect } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import VendorsPageClient from './VendorsPageClient';
import type { HomeVendor } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vendors · Petales' };

export default async function VendorsPage() {
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const admin = supabaseAdmin();
  const { data: vendors } = await admin
    .from('home_vendors')
    .select('*')
    .eq('home_id', authed.home.id)
    .order('is_preferred', { ascending: false })
    .order('use_count', { ascending: false })
    .order('name', { ascending: true });

  return (
    <VendorsPageClient
      initialVendors={(vendors || []) as HomeVendor[]}
      homeName={authed.home.name}
    />
  );
}
