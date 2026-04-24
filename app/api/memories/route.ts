// POST   /api/memories — add a new memory to an archive (by share_slug)
// DELETE /api/memories?id=xxx — remove one
// Enforces text length, name length, and per-archive count caps.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LIMITS } from '@/lib/limits';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      share_slug,
      author_name,
      author_email,
      memory_type,
      text_content,
      media_url,
      caption,
      duration_seconds,
    } = body;

    // ——— Field presence ———
    if (!share_slug || !author_name || !memory_type) {
      return NextResponse.json(
        { error: 'share_slug, author_name, and memory_type are required' },
        { status: 400 }
      );
    }

    if (!['text', 'photo', 'voice', 'video'].includes(memory_type)) {
      return NextResponse.json(
        { error: `Invalid memory_type "${memory_type}".` },
        { status: 400 }
      );
    }

    // ——— Length caps ———
    const trimmedAuthor = String(author_name).trim();
    if (trimmedAuthor.length < LIMITS.AUTHOR_NAME_MIN_CHARS) {
      return NextResponse.json({ error: 'Please add your name.' }, { status: 400 });
    }
    if (trimmedAuthor.length > LIMITS.AUTHOR_NAME_MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Name is too long (${trimmedAuthor.length} characters; max ${LIMITS.AUTHOR_NAME_MAX_CHARS}).`,
        },
        { status: 400 }
      );
    }

    if (memory_type === 'text') {
      const t = String(text_content || '').trim();
      if (t.length === 0) {
        return NextResponse.json({ error: 'Please write something before saving.' }, { status: 400 });
      }
      if (t.length > LIMITS.TEXT_MEMORY_MAX_CHARS) {
        return NextResponse.json(
          {
            error: `Memory is too long (${t.length} characters; max ${LIMITS.TEXT_MEMORY_MAX_CHARS}).`,
          },
          { status: 400 }
        );
      }
    }

    if (caption && String(caption).length > LIMITS.CAPTION_MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Caption is too long (${String(caption).length} characters; max ${LIMITS.CAPTION_MAX_CHARS}).`,
        },
        { status: 400 }
      );
    }

    if (memory_type !== 'text' && !media_url) {
      return NextResponse.json(
        { error: 'media_url is required for photo, voice, and video memories.' },
        { status: 400 }
      );
    }

    // ——— Lookup archive ———
    const admin = supabaseAdmin();
    const { data: archive, error: archiveErr } = await admin
      .from('archives')
      .select('id')
      .eq('share_slug', share_slug)
      .single();

    if (archiveErr || !archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    // ——— Per-archive memory count cap ———
    const { count } = await admin
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id);

    if ((count || 0) >= LIMITS.MEMORIES_PER_ARCHIVE) {
      return NextResponse.json(
        {
          error: `This archive has reached the limit of ${LIMITS.MEMORIES_PER_ARCHIVE} memories.`,
        },
        { status: 403 }
      );
    }

    // ——— Insert ———
    const { data, error } = await admin
      .from('memories')
      .insert({
        archive_id: archive.id,
        author_name: trimmedAuthor,
        author_email: author_email || null,
        memory_type,
        text_content: memory_type === 'text' ? String(text_content).trim() : null,
        media_url: media_url || null,
        caption: caption ? String(caption).trim() : null,
        duration_seconds: duration_seconds || null,
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const admin = supabaseAdmin();
    const { error } = await admin.from('memories').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
