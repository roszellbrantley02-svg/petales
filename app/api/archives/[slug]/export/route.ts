// GET /api/archives/[slug]/export — stream a zip containing the entire
// archive: metadata, memories, media files, the most recent obituary, and an
// offline-readable index.html.
//
// PUBLIC: any family member with the slug can download their archive.
// This is the Tier 1 "you have your own copy" Forever-Promise feature
// (see docs/forever-promise.md).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import type { Memory } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const admin = supabaseAdmin();

    // 1. Verify the archive exists
    const { data: archive } = await admin
      .from('archives')
      .select('*')
      .eq('share_slug', slug)
      .single();

    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
    }

    // 2. Pull everything related
    const [memoriesRes, wallNotesRes, candlesRes, generationsRes] = await Promise.all([
      admin.from('memories').select('*').eq('archive_id', archive.id).order('created_at', { ascending: true }),
      admin.from('wall_notes').select('*').eq('archive_id', archive.id).order('created_at', { ascending: true }),
      admin.from('candles').select('*').eq('archive_id', archive.id).order('created_at', { ascending: true }),
      admin.from('generations').select('*').eq('archive_id', archive.id).order('created_at', { ascending: true }),
    ]);

    const memories = memoriesRes.data || [];
    const wallNotes = wallNotesRes.data || [];
    const candles = candlesRes.data || [];
    const generations = generationsRes.data || [];

    // 3. Build the zip (Node Readable)
    const zip = archiver('zip', { zlib: { level: 9 } });
    zip.on('warning', (err) => console.warn('[export] archiver warning:', err));
    zip.on('error', (err) => console.error('[export] archiver error:', err));

    // README
    zip.append(buildReadme(archive, memories, wallNotes, candles), { name: 'README.txt' });

    // Full structured metadata
    zip.append(JSON.stringify({ archive, memories, wall_notes: wallNotes, candles, generations }, null, 2), {
      name: 'archive.json',
    });

    // Most recent obituary, if one was generated
    const obit = [...generations].reverse().find((g) => String(g.tool).startsWith('obit_'));
    if (obit && obit.content) {
      zip.append(String(obit.content), { name: 'obituary.md' });
    }

    // Each memory's media file (best-effort — skip failures, log them)
    for (const m of memories as Memory[]) {
      if (!m.media_url || m.memory_type === 'text') continue;
      try {
        const folder =
          m.memory_type === 'photo' ? 'photos' : m.memory_type === 'voice' ? 'voice' : 'videos';
        const ext = guessExtension(m.media_url, m.memory_type);
        const safeAuthor = sanitize(m.author_name || 'unknown');
        const filename = `${safeAuthor}-${String(m.id).slice(0, 8)}${ext}`;
        const res = await fetch(m.media_url);
        if (!res.ok) continue;
        const arr = new Uint8Array(await res.arrayBuffer());
        zip.append(Buffer.from(arr), { name: `media/${folder}/${filename}` });
      } catch (e) {
        console.warn('[export] failed to fetch media for memory', m.id, e);
      }
    }

    // Offline-readable HTML index
    zip.append(buildIndexHtml(archive, memories as Memory[], wallNotes, candles), { name: 'index.html' });

    zip.finalize();

    // 4. Convert Node Readable → Web ReadableStream and return
    const stream = Readable.toWeb(zip) as unknown as ReadableStream;
    const filename = `${sanitize(archive.subject_name || 'archive')}-petales.zip`;

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[export] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────── helpers ───────────────

function sanitize(s: string): string {
  return String(s)
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'untitled';
}

function guessExtension(url: string, memoryType: string): string {
  const fromUrl = url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  if (fromUrl) return '.' + fromUrl[1].toLowerCase();
  if (memoryType === 'photo') return '.jpg';
  if (memoryType === 'voice') return '.mp3';
  if (memoryType === 'video') return '.mp4';
  return '';
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ArchiveLite {
  subject_name?: string;
  subject_dates?: string | null;
  share_slug?: string;
  cover_photo_url?: string | null;
}
interface NoteLite { author_name?: string | null; message?: string; created_at?: string }
interface CandleLite { lit_by?: string | null; dedication?: string | null; created_at?: string }

function buildReadme(
  archive: ArchiveLite,
  memories: unknown[],
  wallNotes: unknown[],
  candles: unknown[]
): string {
  const date = new Date().toISOString().slice(0, 10);
  return `Petales Archive Export
======================

This zip contains a complete copy of the memorial archive for:
  ${archive.subject_name || '(no name)'}${archive.subject_dates ? ' (' + archive.subject_dates + ')' : ''}

Exported: ${date}

What's inside:
  README.txt        This file.
  index.html        A self-contained webpage you can open in any browser,
                    even with no internet connection. Double-click it to
                    view the archive offline.
  archive.json      All metadata in machine-readable form. Useful if you
                    ever want to migrate this to another platform.
  obituary.md       The most recent obituary, if one was generated.
  media/photos/     All photos contributed by family members.
  media/voice/      All voice notes contributed by family members.
  media/videos/     All videos contributed by family members.

Counts:
  Memories: ${memories.length}
  Wall notes: ${wallNotes.length}
  Candles lit: ${candles.length}

Why we give you this:
  Your archive is yours. We promise to keep it accessible online for at
  least 10 years from the last day someone in your family adds to it.
  But we don't think you should have to depend on us alone. This zip is
  your independent copy — keep it on a backup drive, share it with a
  family member, store it in a safe deposit box. Nothing about your
  loved one's memory should depend on a single company surviving.

  — Petales
`;
}

function buildIndexHtml(
  archive: ArchiveLite,
  memories: Memory[],
  wallNotes: NoteLite[],
  candles: CandleLite[]
): string {
  const memBlocks = memories
    .map((m) => {
      const author = escapeHtml(m.author_name);
      const when = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
      let body = '';
      if (m.memory_type === 'text') {
        body = `<p class="text">${escapeHtml(m.text_content || '').replace(/\n/g, '<br>')}</p>`;
      } else if (m.memory_type === 'photo') {
        const ext = guessExtension(m.media_url || '', 'photo');
        const safeAuthor = sanitize(m.author_name || 'unknown');
        const filename = `${safeAuthor}-${String(m.id).slice(0, 8)}${ext}`;
        body = `<img src="media/photos/${escapeHtml(filename)}" alt="${escapeHtml(m.caption || '')}" loading="lazy">`;
        if (m.caption) body += `<p class="caption">${escapeHtml(m.caption)}</p>`;
      } else if (m.memory_type === 'voice') {
        const ext = guessExtension(m.media_url || '', 'voice');
        const safeAuthor = sanitize(m.author_name || 'unknown');
        const filename = `${safeAuthor}-${String(m.id).slice(0, 8)}${ext}`;
        body = `<audio controls preload="none" src="media/voice/${escapeHtml(filename)}"></audio>`;
        if (m.caption) body += `<p class="caption">${escapeHtml(m.caption)}</p>`;
      } else if (m.memory_type === 'video') {
        const ext = guessExtension(m.media_url || '', 'video');
        const safeAuthor = sanitize(m.author_name || 'unknown');
        const filename = `${safeAuthor}-${String(m.id).slice(0, 8)}${ext}`;
        body = `<video controls preload="none" src="media/videos/${escapeHtml(filename)}"></video>`;
        if (m.caption) body += `<p class="caption">${escapeHtml(m.caption)}</p>`;
      }
      return `<article class="memory">
  ${body}
  <footer class="byline">— ${author}<span class="date">${when ? ' · ' + escapeHtml(when) : ''}</span></footer>
</article>`;
    })
    .join('\n');

  const wallBlocks = wallNotes
    .map((w) => {
      const author = escapeHtml(w.author_name || 'A friend');
      return `<div class="wall-note"><p>${escapeHtml(w.message || '')}</p><footer>— ${author}</footer></div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(archive.subject_name)} · Petales Archive</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #faf8f4;
    font-family: Georgia, 'Times New Roman', serif;
    color: #2a2623;
    line-height: 1.65;
  }
  .container { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
  header.archive-header { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #e8e2d6; }
  .label { font-style: italic; color: #6b6258; font-size: 16px; margin-bottom: 8px; }
  h1 { font-weight: 500; font-size: 36px; margin: 0 0 8px; letter-spacing: -0.01em; }
  .dates { color: #6b6258; font-size: 14px; letter-spacing: 0.04em; }
  .cover { margin: 24px auto 0; max-width: 320px; border-radius: 8px; }
  h2 { font-weight: 500; font-size: 22px; margin: 48px 0 24px; color: #3d3733; }
  .memory { background: #ffffff; border: 1px solid #e8e2d6; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .memory img, .memory video { width: 100%; height: auto; border-radius: 8px; }
  .memory audio { width: 100%; }
  .memory .text { margin: 0 0 12px; font-size: 17px; }
  .memory .caption { margin: 12px 0 0; font-style: italic; color: #6b6258; font-size: 14px; }
  .memory .byline { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0ebe1; font-size: 14px; color: #6b6258; font-style: italic; }
  .memory .date { color: #a89e92; }
  .wall-note { background: #fff; border: 1px solid #e8e2d6; border-left: 3px solid #8b6f47; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; }
  .wall-note footer { margin-top: 8px; font-size: 13px; color: #6b6258; font-style: italic; }
  .candles-summary { text-align: center; padding: 24px; background: #fff; border: 1px solid #e8e2d6; border-radius: 12px; }
  .candles-count { font-size: 32px; font-weight: 500; color: #8b6f47; }
  .candles-label { color: #6b6258; font-size: 14px; margin-top: 4px; }
  footer.export-footer { text-align: center; margin-top: 64px; padding-top: 32px; border-top: 1px solid #e8e2d6; color: #a89e92; font-size: 13px; font-style: italic; }
  @media print { body { background: #fff; } .memory, .wall-note, .candles-summary { break-inside: avoid; } }
</style>
</head>
<body>
<div class="container">
  <header class="archive-header">
    <div class="label">In memory of</div>
    <h1>${escapeHtml(archive.subject_name)}</h1>
    ${archive.subject_dates ? `<div class="dates">${escapeHtml(archive.subject_dates)}</div>` : ''}
    ${archive.cover_photo_url ? `<img class="cover" src="${escapeHtml(archive.cover_photo_url)}" alt="">` : ''}
  </header>

  ${memories.length > 0 ? `<h2>Memories (${memories.length})</h2>${memBlocks}` : ''}

  ${wallNotes.length > 0 ? `<h2>Wall (${wallNotes.length} notes)</h2>${wallBlocks}` : ''}

  ${candles.length > 0 ? `<h2>Candles</h2>
  <div class="candles-summary">
    <div class="candles-count">${candles.length}</div>
    <div class="candles-label">candles lit in their memory</div>
  </div>` : ''}

  <footer class="export-footer">
    This is your permanent copy. Exported from Petales on ${escapeHtml(new Date().toISOString().slice(0,10))}.<br>
    Keep it. Share it. Pass it down.
  </footer>
</div>
</body>
</html>`;
}
