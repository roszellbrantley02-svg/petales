// /home/staff — manage who at the funeral home can sign in

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StaffPageClient from './StaffPageClient';
import type { Staff } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const admin = supabaseAdmin();
  const { data: staff } = await admin
    .from('staff')
    .select('*')
    .eq('home_id', authed.home.id)
    .order('created_at', { ascending: true });

  return (
    <StaffPageClient
      staff={(staff || []) as Staff[]}
      homeName={authed.home.name}
      currentStaffId={authed.staff.id}
      currentRole={authed.staff.role}
    />
  );
}
