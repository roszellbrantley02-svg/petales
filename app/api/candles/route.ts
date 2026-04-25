// GET  /api/candles?slug=xxx — count + recent candles for an archive
// POST /api/candles            — light a new candle

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LIMITS } from '@/lib/limits';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const admin = supabaseAdmin();

    const { data: archive } = await admin
      .from('archives')
      .select('id')
      .eq('share_slug', slug)
      .single();

    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    const { count } = await admin
      .from('candles')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id);

    const { data: recent } = await admin
      .from('candles')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      count: count || 0,
      recent: recent || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, lit_by, dedication } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const trimmedDedication = dedication ? String(dedication).trim() : null;
    if (trimmedDedication && trimmedDedication.length > LIMITS.CANDLE_DEDICATION_MAX_CHARS) {
      return NextResponse.json(
        { error: `Dedication too long (max ${LIMITS.CANDLE_DEDICATION_MAX_CHARS} chars)` },
        { status: 400 }
      );
    }

    const trimmedLitBy = lit_by ? String(lit_by).trim() : null;

    const admin = supabaseAdmin();

    const { data: archive } = await admin
      .from('archives')
      .select('id')
      .eq('share_slug', slug)
      .single();
    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    // Cap on candles per archive
    const { count } = await admin
      .from('candles')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id);

    if ((count || 0) >= LIMITS.CANDLES_PER_ARCHIVE_MAX) {
      return NextResponse.json(
        { error: 'This archive has reached the maximum number of candles.' },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from('candles')
      .insert({
        archive_id: archive.id,
        lit_by: trimmedLitBy || null,
        dedication: trimmedDedication || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      candle: data,
      total: (count || 0) + 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
