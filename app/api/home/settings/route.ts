// GET /api/home/settings — returns the funeral home's print supplier + name
// for the PrintShopActions component to render.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export async function GET() {
  try {
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = supabaseAdmin();
    const { data } = await admin
      .from('funeral_homes')
      .select('name, print_supplier_name, print_supplier_email, print_supplier_notes')
      .eq('id', authed.home.id)
      .single();

    return NextResponse.json({
      home_name: data?.name || authed.home.name,
      print_supplier_name: data?.print_supplier_name || null,
      print_supplier_email: data?.print_supplier_email || null,
      print_supplier_notes: data?.print_supplier_notes || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
