'use client';

import { useState, useEffect } from 'react';
import LiveBriefPanel from './LiveBriefPanel';
import ArchiveSettingsPanel from './ArchiveSettingsPanel';
import type { Archive, Memory } from '@/lib/types';
import VendorSection from './VendorSection';
import BroadcastSection from './BroadcastSection';
import DonationSettings from './DonationSettings';

type GenerateTool =
  | 'obit_traditional'
  | 'obit_celebratory'
  | 'obit_personal'
  | 'eulogy'
  | 'death_notice'
  | 'memorial_card'
  | 'order_of_service'
  | 'memorial_program'
  | 'service_timeline'
  | 'reading_music_suggestions'
  | 'thank_yous'
  | 'acknowledgment_letter'
  | 'grief_resources'
  | 'director_brief';

type Tradition =
  | 'none'
  | 'catholic'
  | 'protestant'
  | 'jewish'
  | 'buddhist'
  | 'hindu'
  | 'muslim'
  | 'secular';

type Language = 'en' | 'es' | 'fr' | 'pt' | 'zh' | 'de' | 'it';

const TRADITION_OPTIONS: { value: Tradition; label: string }[] = [
  { value: 'none', label: 'No specific tradition' },
  { value: 'catholic', label: 'Catholic' },
  { value: 'protestant', label: 'Protestant Christian' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'secular', label: 'Secular humanist' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Mandarin' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
];

const TOOL_META: Record<GenerateTool, { title: string; sub: string }> = {
  obit_traditional: { title: 'Obituary — Traditional', sub: 'For newspapers and formal printing' },
  obit_celebratory: { title: 'Obituary — Celebratory', sub: 'Warmer tone, for memorial websites' },
  obit_personal: { title: 'Obituary — Personal', sub: 'Intimate, for the funeral program' },
  eulogy: { title: 'Eulogy Draft', sub: 'First-person, for the speaker' },
  death_notice: { title: 'Death Notice', sub: 'Short version for paid newspaper notices' },
  memorial_card: { title: 'Memorial Card', sub: 'Small printed card handed out at the service' },
  order_of_service: { title: 'Order of Service', sub: 'Schedule printed inside the program' },
  memorial_program: { title: 'Memorial Program (full)', sub: 'Complete printable program text' },
  service_timeline: { title: 'Service-Day Timeline', sub: 'Minute-by-minute for the director' },
  reading_music_suggestions: { title: 'Readings & Music', sub: 'Five of each, drawn from the archive' },
  thank_yous: { title: 'Thank-You Notes', sub: 'Personalized per contributor' },
  acknowledgment_letter: { title: 'Acknowledgment Letter', sub: 'For charities receiving donations' },
  grief_resources: { title: 'Grief Support Resources', sub: 'Curated list for the family' },
  director_brief: { title: 'Pre-Meeting Brief', sub: 'One-page summary the director reads before the arrangement conference' },
};

// Grouped for the UI — same data, organized for scanability
const TOOL_GROUPS: { label: string; tools: GenerateTool[] }[] = [
  {
    label: 'Pre-Meeting',
    tools: ['director_brief'],
  },
  {
    label: 'Obituary',
    tools: ['obit_traditional', 'obit_celebratory', 'obit_personal'],
  },
  {
    label: 'Service writing',
    tools: ['eulogy', 'death_notice', 'memorial_card', 'order_of_service', 'memorial_program', 'service_timeline'],
  },
  {
    label: 'Suggestions',
    tools: ['reading_music_suggestions'],
  },
  {
    label: 'After the service',
    tools: ['thank_yous', 'acknowledgment_letter', 'grief_resources'],
  },
];

interface Props {
  archive: Archive;
  memories: Memory[];
}

export default function ConsoleDetailClient({ archive, memories }: Props) {
  const [output, setOutput] = useState<string>('');
  const [outputTitle, setOutputTitle] = useState<string>('');
  const [cachedGenerations, setCachedGenerations] = useState<Record<string, { content: string; generated_at: string }>>({});
  const [activeToolKey, setActiveToolKey] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [copyBanner, setCopyBanner] = useState<boolean>(false);
  const [tradition, setTradition] = useState<Tradition>('none');
  const [language, setLanguage] = useState<Language>('en');

  const initial = (archive.subject_name || '?').charAt(0).toUpperCase();
  const contributors = new Set(memories.map(m => (m.author_name || '').toLowerCase())).size;
  const photos = memories.filter(m => m.memory_type === 'photo').length;
  const voice = memories.filter(m => m.memory_type === 'voice').length;
  const video = memories.filter(m => m.memory_type === 'video').length;

  const familyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${archive.share_slug}`
    : `/p/${archive.share_slug}`;

  useEffect(() => {
    fetch(`/api/generations?slug=${archive.share_slug}`)
      .then((r) => (r.ok ? r.json() : { generations: {} }))
      .then((d) => {
        if (d?.generations) setCachedGenerations(d.generations);
      })
      .catch(() => {});
  }, [archive.share_slug]);

  async function generate(tool: GenerateTool, force = false) {
    // Build a tool-key that includes tradition/language so caching is per-variant
    const toolKey = `${tool}|${tradition || 'none'}|${language || 'en'}`;

    // Build a richer title that reflects tradition + language
    const traditionLabel = tradition !== 'none'
      ? TRADITION_OPTIONS.find(t => t.value === tradition)?.label
      : null;
    const languageLabel = language !== 'en'
      ? LANGUAGE_OPTIONS.find(l => l.value === language)?.label
      : null;
    const modifiers = [traditionLabel, languageLabel].filter(Boolean).join(' · ');
    const fullTitle = modifiers
      ? `${TOOL_META[tool].title} (${modifiers})`
      : TOOL_META[tool].title;
    setOutputTitle(fullTitle);
    setActiveToolKey(toolKey);

    // CACHE-FIRST: if we already have this tool's content for this exact variant
    // (tool|tradition|language) in cache, show it instantly without calling Claude.
    // Only regenerate when the director explicitly clicks Regenerate (force=true).
    if (!force && cachedGenerations[toolKey]) {
      setOutput(cachedGenerations[toolKey].content);
      setGenerating(false);
      return;
    }

    setGenerating(true);
    setOutput('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: archive.share_slug,
          tool,
          tradition: tradition === 'none' ? undefined : tradition,
          language: language === 'en' ? undefined : language,
          force: force,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }
      const data = await res.json();
      setOutput(data.content);
      // Save to cache (keyed by variant) so subsequent clicks don't re-call Claude
      setCachedGenerations((prev) => ({
        ...prev,
        [toolKey]: {
          content: data.content,
          generated_at: data.generated_at || new Date().toISOString(),
        },
      }));
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
    <>
      <LiveBriefPanel archive={archive} />
      <ArchiveSettingsPanel archive={archive} />
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
        <a href={`/home/${archive.share_slug}/program`} className="text-muted text-sm hover:text-ink no-print">Print memorial program →</a>
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

        {/* Vendor coordination */}
        <VendorSection
          archiveSlug={archive.share_slug}
          subjectName={archive.subject_name}
          subjectDates={archive.subject_dates}
        />

        {/* Family announcement broadcaster */}
        <BroadcastSection archiveSlug={archive.share_slug} />

        {/* Donation link (in lieu of flowers) */}
        <DonationSettings
          archiveSlug={archive.share_slug}
          initialCharityName={archive.donation_charity_name}
          initialUrl={archive.donation_url}
          initialNote={archive.donation_note}
        />

        {/* Generate */}
        <div className="text-xs font-semibold uppercase tracking-widest text-muted mt-7 mb-3">Generate</div>

        {/* Tradition + language selectors — apply to next click */}
        <div className="bg-white border border-line rounded-xl p-4 mb-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Tradition</label>
            <select
              value={tradition}
              onChange={e => setTradition(e.target.value as Tradition)}
              disabled={generating}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none disabled:opacity-60"
            >
              {TRADITION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              disabled={generating}
              className="w-full border border-line bg-cream rounded-lg px-3 py-2 text-sm focus:border-sage focus:bg-white focus:outline-none disabled:opacity-60"
            >
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {(tradition !== 'none' || language !== 'en') && (
            <div className="md:col-span-2 text-xs text-subtle italic">
              Selected: {[
                tradition !== 'none' && TRADITION_OPTIONS.find(t => t.value === tradition)?.label,
                language !== 'en' && LANGUAGE_OPTIONS.find(l => l.value === language)?.label,
              ].filter(Boolean).join(' · ')} — applies to your next generation. Click any button below.
            </div>
          )}
        </div>

        <div className="space-y-5 mb-5">
          {TOOL_GROUPS.map(group => (
            <div key={group.label}>
              <div className="text-xs font-medium text-subtle mb-2 italic">{group.label}</div>
              <div className="grid md:grid-cols-2 gap-2.5">
                {group.tools.map(tool => (
                  <button
                    key={tool}
                    onClick={() => generate(tool)}
                    disabled={generating}
                    className="bg-white border border-line rounded-xl p-4 text-left hover:border-sage hover:bg-[#fdfcf8] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="font-semibold text-sm mb-1">{TOOL_META[tool].title}</div>
                    <div className="text-muted text-xs">{TOOL_META[tool].sub}</div>
                  </button>
                ))}
              </div>
            </div>
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
                          {!generating && activeToolKey && (
                <button
                  onClick={() => {
                    // Find the tool from the toolKey
                    const tool = activeToolKey.split('|')[0] as GenerateTool;
                    if (confirm('Regenerate this with Claude? Each regeneration uses AI credits.')) {
                      generate(tool, true);
                    }
                  }}
                  className="text-xs uppercase tracking-wider text-muted hover:text-ink mb-3"
                >
                  ↻ Regenerate
                </button>
              )}
<p className="text-xs text-subtle mt-3 italic">
              Drafted by Claude from the family&apos;s own contributions. Always review and edit before finalizing.
            </p>
          </div>
        )}
      </div>
    </div>
    </>
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
