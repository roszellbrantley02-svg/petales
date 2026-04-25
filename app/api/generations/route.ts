// GET /api/generations?slug=xxx — returns the most recent generation per tool
// for an archive. Used by the staff console to show cached AI output instead
// of re-generating (which costs Claude tokens) every time the director clicks
// a tool button.
//
// STAFF-ONLY: ownership of the archive enforced.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwnedArchiveBySlug } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;
    const archive = guard.archive;

    const admin = supabaseAdmin();

    // Pull all generations for this archive, newest first
    const { data, error } = await admin
      .from('generations')
      .select('id, tool, content, created_at')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by tool — keep only the most recent for each
    const latestByTool: Record<string, { id: string; content: string; generated_at: string }> = {};
    for (const row of data || []) {
      if (!latestByTool[row.tool]) {
        latestByTool[row.tool] = {
          id: row.id,
          content: row.content,
          generated_at: row.created_at,
        };
      }
    }

    return NextResponse.json({ generations: latestByTool });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
