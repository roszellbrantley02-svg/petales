// GET /api/marketplace/click?slug=xxx&item=yyy
// Logs the click and 302s to the vendor's URL.
//
// Two flavors of item:
//   1. A curated marketplace item (item_id matches lib/marketplace.ts)
//   2. The archive's custom donation link (item=donation, slug=archive)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getItem } from '@/lib/marketplace';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const itemId = searchParams.get('item');

    if (!slug || !itemId) {
      return NextResponse.json({ error: 'slug and item are required' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Look up archive
    const { data: archive } = await admin
      .from('archives')
      .select('id, donation_url, donation_charity_name')
      .eq('share_slug', slug)
      .single();

    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    let destinationUrl: string | null = null;
    let category: string | null = null;
    let vendor: string | null = null;

    if (itemId === 'donation') {
      // Family's custom-set donation link
      destinationUrl = archive.donation_url;
      category = 'donation';
      vendor = archive.donation_charity_name;
      if (!destinationUrl) {
        return NextResponse.json({ error: 'No donation URL set for this archive' }, { status: 404 });
      }
    } else {
      // Curated marketplace item
      const item = getItem(itemId);
      if (!item) {
        return NextResponse.json({ error: 'Unknown marketplace item' }, { status: 404 });
      }
      destinationUrl = item.url;
      category = item.category;
      vendor = item.vendor;
    }

    // Log the click (non-blocking)
    const headers = req.headers;
    const referrer = headers.get('referer') || null;
    const userAgent = headers.get('user-agent') || null;
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const ipHash = ip
      ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
      : null;

    admin
      .from('marketplace_clicks')
      .insert({
        archive_id: archive.id,
        item_id: itemId,
        category,
        vendor,
        destination_url: destinationUrl,
        referrer,
        user_agent: userAgent,
        ip_hash: ipHash,
      })
      .then(() => {});  // fire-and-forget

    return NextResponse.redirect(destinationUrl, 302);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Marketplace click error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
