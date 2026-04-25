// POST /api/archives — create a new archive
// GET  /api/archives — list archives for the current staff's home

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedStaff } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authed = await getAuthedStaff();
    if (!authed) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { subject_name, subject_dates, cover_photo_url, family_contact_email } = body;

    if (!subject_name) {
      return NextResponse.json({ error: 'subject_name is required' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('archives')
      .insert({
        subject_name,
        subject_dates: subject_dates || null,
        cover_photo_url: cover_photo_url || null,
        home_id: authed.home.id,  // Always scope to the signed-in staff's home
        family_contact_email: family_contact_email || null,
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

export async function GET() {
  try {
    const authed = await getAuthedStaff();
    if (!authed) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('archives')
      .select('*')
      .eq('home_id', authed.home.id)
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
