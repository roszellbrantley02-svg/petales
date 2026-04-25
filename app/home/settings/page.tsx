import { redirect } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import SettingsClient from './SettingsClient';
import type { FuneralHome } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home settings · Petales' };

export default async function SettingsPage() {
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  return (
    <SettingsClient
      home={authed.home as FuneralHome & {
        print_supplier_name?: string | null;
        print_supplier_email?: string | null;
        print_supplier_notes?: string | null;
      }}
      isAdmin={authed.staff.role === 'admin'}
    />
  );
}
