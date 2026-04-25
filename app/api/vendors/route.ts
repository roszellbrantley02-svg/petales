// GET    /api/vendors?slug=xxx — list vendors for an archive (by share_slug)
// POST   /api/vendors            — create a new vendor
// DELETE /api/vendors?id=xxx     — remove a vendor
// All STAFF-ONLY: vendor coordination is internal to the funeral home.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwnedArchiveBySlug, requireOwnedChildById } from '@/lib/auth';
import type { VendorType, VendorStatus } from '@/lib/types';

const VALID_VENDOR_TYPES: VendorType[] = [
  'florist', 'clergy', 'musician', 'caterer', 'transportation',
  'cemetery', 'photographer', 'reception_venue', 'pallbearer', 'other',
];

const VALID_STATUSES: VendorStatus[] = [
  'not_contacted', 'contacted', 'confirmed', 'completed', 'cancelled',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    // STAFF-ONLY ownership check
    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;
    const archive = guard.archive;

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from('vendors')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slug,
      vendor_type,
      name,
      contact_email,
      contact_phone,
      status,
      notes,
      needed_at,
      home_vendor_id,
    } = body;

    if (!slug || !vendor_type || !name) {
      return NextResponse.json(
        { error: 'slug, vendor_type, and name are required' },
        { status: 400 }
      );
    }
    if (!VALID_VENDOR_TYPES.includes(vendor_type)) {
      return NextResponse.json({ error: 'Invalid vendor_type' }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (String(name).length > 200) {
      return NextResponse.json({ error: 'Name too long (max 200 chars)' }, { status: 400 });
    }

    // STAFF-ONLY ownership check
    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;
    const archive = guard.archive;

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from('vendors')
      .insert({
        archive_id: archive.id,
        vendor_type,
        name: String(name).trim(),
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        status: status || 'not_contacted',
        notes: notes || null,
        needed_at: needed_at || null,
        home_vendor_id: home_vendor_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If this case-vendor was created from a directory entry, bump its use_count.
    if (home_vendor_id) {
      const { data: hv } = await admin
        .from('home_vendors')
        .select('use_count')
        .eq('id', home_vendor_id)
        .single();
      if (hv) {
        await admin
          .from('home_vendors')
          .update({ use_count: (hv.use_count || 0) + 1 })
          .eq('id', home_vendor_id);
      }
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // STAFF-ONLY: verify the vendor's archive belongs to the signed-in staff's home
    const guard = await requireOwnedChildById('vendors', id);
    if (guard.response) return guard.response;

    const admin = supabaseAdmin();
    const { error } = await admin.from('vendors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
