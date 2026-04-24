'use client';

import { useState } from 'react';
import type { Archive, Memory } from '@/lib/types';

type GenerateTool = 'obit_traditional' | 'obit_celebratory' | 'obit_personal' | 'eulogy' | 'thank_yous';

const TOOL_META: Record<GenerateTool, { title: string; sub: string }> = {
  obit_traditional: { title: 'Obituary — Traditional', sub: 'For newspapers and formal printing' },
  obit_celebratory: { title: 'Obituary — Celebratory', sub: 'Warmer tone, for memorial websites' },
  obit_personal: { title: 'Obituary — Personal', sub: 'Intimate, for the funeral program' },
  eulogy: { title: 'Eulogy Draft', sub: 'First-person, for the speaker' },
  thank_yous: { title: 'Thank-You Notes', sub: 'Personalized per contributor' },
};

interface Props {
  archive: Archive;
  memories: Memory[];
}

export default function ConsoleDetailClient({ archive, memories }: Props) {
  const [output, setOutput] = useState<string>('');
  const [outputTitle, setOutputTitle] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [copyBanner, setCopyBanner] = useState<boolean>(false);

  const initial = (archive.subject_name || '?').charAt(0).toUpperCase();
  const contributors = new Set(memories.map(m => (m.author_name || '').toLowerCase())).size;
  const photos = memories.filter(m => m.memory_type === 'photo').length;
  const voice = memories.filter(m => m.memory_type === 'voice').length;
  const video = memories.filter(m => m.memory_type === 'video').length;

  const familyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${archive.share_slug}`
    : `/p/${archive.share_slug}`;

  async function generate(tool: GenerateTool) {
    setGenerating(true);
    setOutput('');
    setOutputTitle(TOOL_META[tool].title);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: archive.share_slug, tool }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }
      const data = await res.json();
      setOutput(data.content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setOutput(`Error: ${message}`);
    } finally {
      setGenerating(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopyBanner(true);
      setTimeout(() => setCopyBanner(false), 1500);
    });
  }

  function download() {
    const filename = outputTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyFamilyLink() {
    navigator.clipboard.writeText(familyUrl).then(() => {
      alert('Family view link copied. Text or email it to relatives.');
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f3ed]">
      {/* Top bar */}
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-xs font-medium uppercase tracking-wider bg-tag text-muted px-2 py-1 rounded-full">
            Funeral Home Console
          </span>
        </div>
        <a href="/home" className="text-muted text-sm hover:text-ink">← All families</a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Subject card */}
        <div className="bg-white border border-line rounded-xl p-6 flex gap-5 items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-tag flex items-center justify-center flex-shrink-0 overflow-hidden serif text-3xl text-subtle">
            {archive.cover_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={archive.cover_photo_url} alt={archive.subject_name} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1">
            <div className="serif text-2xl font-medium tracking-tight">{archive.subject_name}</div>
            <div className="text-muted text-sm">{archive.subject_dates || ''}</div>
            <div className="flex gap-5 mt-2 text-xs text-muted flex-wrap">
              <div><span className="text-ink font-semibold">{memories.length}</span> memories</div>
              <div><span className="text-ink font-semibold">{contributors}</span> contributors</div>
              <div><span className="text-ink font-semibold">{photos}</span> photos</div>
              <div><span className="text-ink font-semibold">{voice}</span> voice</div>
              <div><span className="text-ink font-semibold">{video}</span> video</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={`/p/${archive.share_slug}`}
              target="_blank"
              className="border border-line px-3 py-2 rounded-lg text-xs font-medium hover:border-sage hover:text-sage text-center transition-colors"
            >
              Open family view
            </a>
            <button
              onClick={copyFamilyLink}
              className="border border-line px-3 py-2 rounded-lg text-xs font-medium hover:border-sage hover:text-sage transition-colors"
            >
              Copy family link
            </button>
          </div>
        </div>

        {/* Contributions */}
        <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Family Contributions</div>
        <div className="bg-white border border-line rounded-xl overflow-hidden mb-7">
          {memories.length === 0 ? (
            <div className="text-center py-14 text-muted">
              <h3 className="serif text-xl font-medium text-ink mb-2">No contributions yet</h3>
              <p className="text-sm">Share the family view link with relatives so they can add memories.</p>
            </div>
          ) : (
            memories.map(m => <ContributionRow key={m.id} memory={m} />)
          )}
        </div>

        {/* Generate */}
        <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Generate</div>
        <div className="grid md:grid-cols-2 gap-2.5 mb-5">
          {(Object.keys(TOOL_META) as GenerateTool[]).map(tool => (
            <button
              key={tool}
              onClick={() => generate(tool)}
              disabled={generating}
              className="bg-white border border-line rounded-xl p-5 text-left hover:border-sage hover:bg-[#fdfcf8] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-sm mb-1">{TOOL_META[tool].title}</div>
              <div className="text-muted text-xs">{TOOL_META[tool].sub}</div>
            </button>
          ))}
        </div>

        {/* Output */}
        {(output || generating) && (
          <div className="bg-white border border-line rounded-xl p-6 mt-5">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-line flex-wrap gap-3">
              <div className="serif text-xl font-medium">{outputTitle}</div>
              {output && !generating && (
                <div className="flex gap-2 items-center">
                  {copyBanner && <span className="text-xs text-sage">Copied</span>}
                  <button
                    onClick={copy}
                    className="border border-line px-3 py-1.5 rounded-lg text-xs font-medium hover:border-sage hover:text-sage transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={download}
                    className="border border-line px-3 py-1.5 rounded-lg text-xs font-medium hover:border-sage hover:text-sage transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => { setOutput(''); setOutputTitle(''); }}
                    className="text-muted hover:text-ink px-3 py-1.5 text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            {generating ? (
              <div className="py-10 text-center text-muted">
                <div className="serif italic text-lg mb-2">Gathering the family&apos;s words…</div>
                <div className="text-xs">Claude is reading every contribution and weaving a draft.</div>
              </div>
            ) : (
              <textarea
                value={output}
                onChange={e => setOutput(e.target.value)}
                className="w-full min-h-[320px] border border-line rounded-lg p-5 serif text-base leading-relaxed bg-[#fefdf9] focus:border-sage focus:outline-none resize-y"
              />
            )}
            <p className="text-xs text-subtle mt-3 italic">
              Drafted by Claude from the family&apos;s own contributions. Always review and edit before finalizing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ContributionRow({ memory }: { memory: Memory }) {
  const [expanded, setExpanded] = useState(false);
  const badge = { text: 'T', photo: 'IMG', voice: 'AUD', video: 'VID' }[memory.memory_type] || '—';
  const date = new Date(memory.created_at).toLocaleDateString();

  return (
    <div className="px-5 py-4 border-b border-line last:border-b-0 flex gap-3.5">
      <div className="w-8 h-8 rounded-md bg-tag flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted">
        {badge}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted mb-1">
          <strong className="text-ink mr-2">{memory.author_name}</strong>{date}
        </div>
        {memory.memory_type === 'text' && (
          <>
            <div className={`text-sm ${expanded ? '' : 'line-clamp-3'} whitespace-pre-wrap`}>
              {memory.text_content}
            </div>
            {memory.text_content && memory.text_content.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sage text-xs mt-1 hover:underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
        {memory.memory_type === 'photo' && memory.media_url && (
          <>
            <div className="text-sm mb-2">{memory.caption || '(no caption)'}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={memory.media_url} alt="" className="max-w-[200px] max-h-[200px] rounded-md object-cover" />
          </>
        )}
        {memory.memory_type === 'voice' && memory.media_url && (
          <>
            <div className="text-sm mb-2">{memory.caption || 'Voice memory'}</div>
            <audio controls src={memory.media_url} className="w-full max-w-sm" />
          </>
        )}
        {memory.memory_type === 'video' && memory.media_url && (
          <>
            <div className="text-sm mb-2">{memory.caption || 'Video memory'}</div>
            <video controls src={memory.media_url} className="max-w-[300px] max-h-[200px] rounded-md" />
          </>
        )}
      </div>
    </div>
  );
}
