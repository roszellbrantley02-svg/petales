// GET  /api/archives/[slug]/brief — return the cached director brief
//                                     plus current memory count and recent feed.
// POST /api/archives/[slug]/brief — regenerate the brief and update the cache.
//
// STAFF-ONLY: ownership of the archive is enforced.
//
// Refresh policy (lives in POST):
//   - If no cached brief exists: always regenerate
//   - If body.force is true: regenerate (but no more than once per 5 minutes)
//   - Otherwise: regenerate only if last refresh > 1 hour ago AND
//     there are new memories since the last refresh.
//
// This keeps Claude costs predictable while feeling alive to the director.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwnedArchiveBySlug } from '@/lib/auth';
import { generateFromArchive, LowCreditError } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ONE_HOUR_MS = 60 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // even with force, no more than 1/5min

// ─── GET ───
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;
    const archive = guard.archive;

    const admin = supabaseAdmin();

    const { count: currentMemoryCount } = await admin
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id);

    const { data: recentMemories } = await admin
      .from('memories')
      .select('id, author_name, memory_type, text_content, caption, duration_seconds, created_at')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const archiveAny = archive as { brief_content?: string | null; brief_generated_at?: string | null; brief_memory_count?: number | null };
    const memCountAtGen = archiveAny.brief_memory_count || 0;
    const generatedAt = archiveAny.brief_generated_at || null;
    const ageMs = generatedAt ? Date.now() - new Date(generatedAt).getTime() : Number.POSITIVE_INFINITY;
    const hasNew = (currentMemoryCount || 0) > memCountAtGen;
    const isStale = !archiveAny.brief_content || (ageMs > ONE_HOUR_MS && hasNew);

    return NextResponse.json({
      brief: archiveAny.brief_content || null,
      generated_at: generatedAt,
      memory_count_at_generation: memCountAtGen,
      current_memory_count: currentMemoryCount || 0,
      is_stale: isStale,
      recent_memories: recentMemories || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[brief GET] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST (refresh) ───
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const guard = await requireOwnedArchiveBySlug(slug);
    if (guard.response) return guard.response;
    const archive = guard.archive;

    const body = await req.json().catch(() => ({}));
    const force = !!body.force;

    const admin = supabaseAdmin();

    // Get current memory count
    const { count: currentMemoryCount } = await admin
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id);

    const archiveAny = archive as { brief_content?: string | null; brief_generated_at?: string | null; brief_memory_count?: number | null };
    const cached = archiveAny.brief_content;
    const generatedAt = archiveAny.brief_generated_at;
    const ageMs = generatedAt ? Date.now() - new Date(generatedAt).getTime() : Number.POSITIVE_INFINITY;
    const memCountAtGen = archiveAny.brief_memory_count || 0;
    const hasNew = (currentMemoryCount || 0) > memCountAtGen;

    // Decide whether to actually regenerate
    if (cached && !force) {
      // Only regenerate if stale (over 1 hour old AND new memories exist)
      if (ageMs <= ONE_HOUR_MS || !hasNew) {
        return NextResponse.json({
          brief: cached,
          generated_at: generatedAt,
          memory_count_at_generation: memCountAtGen,
          current_memory_count: currentMemoryCount || 0,
          regenerated: false,
          reason: ageMs <= ONE_HOUR_MS ? 'Brief is fresh (under 1 hour old)' : 'No new contributions since last refresh',
        });
      }
    }

    // Even with force, throttle to no more than once per 5 minutes
    if (cached && force && ageMs < MIN_REFRESH_INTERVAL_MS) {
      const waitSec = Math.ceil((MIN_REFRESH_INTERVAL_MS - ageMs) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${waitSec} seconds before refreshing again.`,
          code: 'REFRESH_TOO_SOON',
        },
        { status: 429 }
      );
    }

    // Need actual content to generate from
    if ((currentMemoryCount || 0) === 0) {
      return NextResponse.json(
        {
          error: 'The family hasn\'t contributed any memories yet. Send them the link and check back later.',
          code: 'NO_MEMORIES',
        },
        { status: 400 }
      );
    }

    // Pull all memories
    const { data: memories } = await admin
      .from('memories')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: true });

    // Generate the brief via Claude
    const archiveWithMemories = { ...archive, memories: memories || [] };
    const newBrief = await generateFromArchive(archiveWithMemories, 'director_brief', {});

    const now = new Date().toISOString();

    // Persist the cache
    await admin
      .from('archives')
      .update({
        brief_content: newBrief,
        brief_generated_at: now,
        brief_memory_count: currentMemoryCount || 0,
      })
      .eq('id', archive.id);

    // Also log to generations for audit/history
    await admin.from('generations').insert({
      archive_id: archive.id,
      tool: 'director_brief',
      content: newBrief,
      status: 'draft',
    });

    return NextResponse.json({
      brief: newBrief,
      generated_at: now,
      memory_count_at_generation: currentMemoryCount || 0,
      current_memory_count: currentMemoryCount || 0,
      regenerated: true,
    });
  } catch (err: unknown) {
    if (err instanceof LowCreditError) {
      return NextResponse.json(
        {
          error: 'The director brief can\u2019t be generated right now \u2014 AI service is temporarily unavailable. Please contact your administrator.',
          code: 'AI_CREDITS_EXHAUSTED',
        },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[brief POST] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
