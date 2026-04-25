// PATCH /api/vendors/[id] — update a vendor (status, contact info, notes)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { VendorStatus } from '@/lib/types';

const VALID_STATUSES: VendorStatus[] = [
  'not_contacted', 'contacted', 'confirmed', 'completed', 'cancelled',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const allowed = ['name', 'contact_email', 'contact_phone', 'status', 'notes', 'needed_at'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.status && !VALID_STATUSES.includes(updates.status as VendorStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (updates.name && String(updates.name).length > 200) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
