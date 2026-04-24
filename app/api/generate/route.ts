// POST /api/generate — call Claude to produce an obituary, eulogy, etc.
//
// Layered cost/abuse protection:
//   1. HARD CAP — generations per calendar month across the entire system
//      (hard circuit breaker; nothing gets past this except editing limits.ts)
//   2. Global daily cap — generations per 24h across all archives
//   3. Per-archive daily cap — generations per 24h for one family
//
// All counts are queried from the `generations` table at request time,
// so they survive server restarts and scale with multiple instances.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateFromArchive, GenerateTool } from '@/lib/claude';
import { LIMITS } from '@/lib/limits';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_TOOLS: GenerateTool[] = [
  'obit_traditional',
  'obit_celebratory',
  'obit_personal',
  'eulogy',
  'thank_yous',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, tool } = body as { slug: string; tool: GenerateTool };

    if (!slug || !tool) {
      return NextResponse.json(
        { error: 'slug and tool are required' },
        { status: 400 }
      );
    }
    if (!VALID_TOOLS.includes(tool)) {
      return NextResponse.json({ error: 'Invalid tool' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // ——————————————————————————————————————————————
    // LAYER 1: HARD MONTHLY CIRCUIT BREAKER
    // This is the kill switch. If this trips, no more generation
    // happens anywhere on the system until next month or the cap
    // is raised in lib/limits.ts.
    // ——————————————————————————————————————————————
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count: monthCount } = await admin
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    if ((monthCount || 0) >= LIMITS.GENERATIONS_PER_MONTH_HARD_CAP) {
      console.warn(
        `[generate] Hard monthly cap reached: ${monthCount}/${LIMITS.GENERATIONS_PER_MONTH_HARD_CAP}`
      );
      return NextResponse.json(
        {
          error:
            'Monthly generation limit reached for the platform. Generation is paused until the next billing cycle. Contact the administrator if this is urgent.',
          code: 'HARD_CAP_REACHED',
        },
        { status: 503 }
      );
    }

    // ——————————————————————————————————————————————
    // LAYER 2: GLOBAL DAILY CAP
    // ——————————————————————————————————————————————
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: globalDayCount } = await admin
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    if ((globalDayCount || 0) >= LIMITS.GENERATIONS_PER_DAY_GLOBAL) {
      return NextResponse.json(
        {
          error: `Daily generation limit reached for the platform (${LIMITS.GENERATIONS_PER_DAY_GLOBAL} per day). Try again tomorrow.`,
          code: 'GLOBAL_DAILY_CAP_REACHED',
        },
        { status: 429 }
      );
    }

    // ——————————————————————————————————————————————
    // LAYER 3: PER-ARCHIVE DAILY CAP
    // ——————————————————————————————————————————————
    const { data: archive, error: archiveErr } = await admin
      .from('archives')
      .select('*')
      .eq('share_slug', slug)
      .single();

    if (archiveErr || !archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    const { count: archiveDayCount } = await admin
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id)
      .gte('created_at', startOfDay.toISOString());

    if ((archiveDayCount || 0) >= LIMITS.GENERATIONS_PER_ARCHIVE_PER_DAY) {
      return NextResponse.json(
        {
          error: `This family has reached today's limit of ${LIMITS.GENERATIONS_PER_ARCHIVE_PER_DAY} generations. Try again tomorrow.`,
          code: 'ARCHIVE_DAILY_CAP_REACHED',
          used: archiveDayCount,
          limit: LIMITS.GENERATIONS_PER_ARCHIVE_PER_DAY,
        },
        { status: 429 }
      );
    }

    // ——————————————————————————————————————————————
    // All checks passed — generate.
    // ——————————————————————————————————————————————

    const { data: memories } = await admin
      .from('memories')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: true });

    if (!memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'This archive has no memories yet — nothing to generate from.' },
        { status: 400 }
      );
    }

    const archiveWithMemories = {
      ...archive,
      memories,
    };

    const content = await generateFromArchive(archiveWithMemories, tool);

    // Log the generation (also serves as the rate-limit counter)
    const { data: gen } = await admin
      .from('generations')
      .insert({
        archive_id: archive.id,
        tool,
        content,
        status: 'draft',
      })
      .select()
      .single();

    return NextResponse.json({
      content,
      generation_id: gen?.id || null,
      usage: {
        archive_today: (archiveDayCount || 0) + 1,
        archive_limit: LIMITS.GENERATIONS_PER_ARCHIVE_PER_DAY,
        global_today: (globalDayCount || 0) + 1,
        global_limit: LIMITS.GENERATIONS_PER_DAY_GLOBAL,
        month_total: (monthCount || 0) + 1,
        month_hard_cap: LIMITS.GENERATIONS_PER_MONTH_HARD_CAP,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Generate error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
