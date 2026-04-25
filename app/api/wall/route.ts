// GET    /api/wall?slug=xxx     — list wall notes for an archive (PUBLIC: family page)
// POST   /api/wall                — leave a new note (PUBLIC: visitors, no login)
// DELETE /api/wall?id=xxx        — remove a note (STAFF-ONLY: enforces archive ownership)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LIMITS } from '@/lib/limits';
import { requireOwnedChildById } from '@/lib/auth';

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

    const { data, error } = await admin
      .from('wall_notes')
      .select('*')
      .eq('archive_id', archive.id)
      .order('created_at', { ascending: false })
      .limit(200);

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
    const { slug, author_name, message } = body;

    if (!slug || !message) {
      return NextResponse.json({ error: 'slug and message are required' }, { status: 400 });
    }

    const trimmedMessage = String(message).trim();
    if (!trimmedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }
    if (trimmedMessage.length > LIMITS.WALL_NOTE_MAX_CHARS) {
      return NextResponse.json(
        { error: `Note too long (max ${LIMITS.WALL_NOTE_MAX_CHARS} chars)` },
        { status: 400 }
      );
    }

    const trimmedAuthor = author_name ? String(author_name).trim() : null;
    if (trimmedAuthor && trimmedAuthor.length > LIMITS.WALL_AUTHOR_MAX_CHARS) {
      return NextResponse.json(
        { error: `Author name too long (max ${LIMITS.WALL_AUTHOR_MAX_CHARS} chars)` },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const { data: archive } = await admin
      .from('archives')
      .select('id')
      .eq('share_slug', slug)
      .single();
    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    // Cap on total notes per archive
    const { count } = await admin
      .from('wall_notes')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archive.id);

    if ((count || 0) >= LIMITS.WALL_NOTES_PER_ARCHIVE_MAX) {
      return NextResponse.json(
        { error: 'This wall has reached the maximum number of notes.' },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from('wall_notes')
      .insert({
        archive_id: archive.id,
        author_name: trimmedAuthor || null,
        message: trimmedMessage,
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

    // STAFF-ONLY: verify the note's archive belongs to the signed-in staff's home
    const guard = await requireOwnedChildById('wall_notes', id);
    if (guard.response) return guard.response;

    const admin = supabaseAdmin();
    const { error } = await admin.from('wall_notes').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
