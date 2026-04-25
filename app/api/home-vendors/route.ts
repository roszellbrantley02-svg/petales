// GET  /api/home-vendors        — list this home's vendor directory
// POST /api/home-vendors        — add a new directory entry
// STAFF-ONLY: scoped to the signed-in staff's home.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';
import type { VendorType } from '@/lib/types';

const VALID_VENDOR_TYPES: VendorType[] = [
  'florist', 'clergy', 'musician', 'caterer', 'transportation',
  'cemetery', 'photographer', 'reception_venue', 'pallbearer', 'other',
];

export async function GET() {
  try {
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('home_vendors')
      .select('*')
      .eq('home_id', authed.home.id)
      .order('is_preferred', { ascending: false })
      .order('use_count', { ascending: false })
      .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authed = await getAuthedStaff();
    if (!authed) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { vendor_type, name, contact_email, contact_phone, notes, is_preferred } = body;

    if (!vendor_type || !name || !String(name).trim()) {
      return NextResponse.json({ error: 'vendor_type and name are required' }, { status: 400 });
    }
    if (!VALID_VENDOR_TYPES.includes(vendor_type)) {
      return NextResponse.json({ error: 'Invalid vendor_type' }, { status: 400 });
    }
    if (String(name).length > 200) {
      return NextResponse.json({ error: 'Name too long (max 200)' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('home_vendors')
      .insert({
        home_id: authed.home.id,
        vendor_type,
        name: String(name).trim(),
        contact_email: contact_email ? String(contact_email).trim() : null,
        contact_phone: contact_phone ? String(contact_phone).trim() : null,
        notes: notes ? String(notes).trim() : null,
        is_preferred: !!is_preferred,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
