'use client';

import { useState } from 'react';
import type { Archive, Memory, MemoryType } from '@/lib/types';
import { LIMITS, fileMaxFor, allowedTypesFor, bytesToReadable } from '@/lib/limits';
import { themeToStyle, type ThemeId } from '@/lib/themes';
import HonorSection from './HonorSection';
import WallSection from './WallSection';
import CandleSection from './CandleSection';
import ThemePicker from './ThemePicker';
import VoiceRecorder from './VoiceRecorder';
import PWAInstallPrompt from './PWAInstallPrompt';
import { compressImage } from '@/lib/image-compression';
import { uploadWithProgress } from '@/lib/upload-with-progress';

interface HomeBranding {
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  tagline: string | null;
}

interface Props {
  archive: Archive;
  initialMemories: Memory[];
  homeBranding?: HomeBranding | null;
}

export default function FamilyArchiveClient({ archive, initialMemories, homeBranding }: Props) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<MemoryType>('text');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [isLastWords, setIsLastWords] = useState(false);
  const [theme, setTheme] = useState<ThemeId>((archive.theme as ThemeId) || 'cream');

  const initial = (archive.subject_name || 'M').charAt(0).toUpperCase();

  function openForm(type: MemoryType) {
    setFormType(type);
    setFormOpen(true);
    setTextContent('');
    setCaption('');
    setMediaFile(null);
    setIsLastWords(false);
  }

  function closeForm() {
    setUploadPct(0);
    setUploadStage('');
    setFormOpen(false);
    setAuthorName('');
    setAuthorEmail('');
    setTextContent('');
    setCaption('');
    setMediaFile(null);
    setIsLastWords(false);
  }

  async function handleSubmit() {
    // ——— Client-side validation (fast feedback) ———
    const trimmedAuthor = authorName.trim();
    if (!trimmedAuthor) {
      alert('Please add your name so we know who shared this memory.');
      return;
    }
    if (trimmedAuthor.length > LIMITS.AUTHOR_NAME_MAX_CHARS) {
      alert(`Name is too long (max ${LIMITS.AUTHOR_NAME_MAX_CHARS} characters).`);
      return;
    }

    if (formType === 'text') {
      const t = textContent.trim();
      if (!t) { alert('Please write something before saving.'); return; }
      if (t.length > LIMITS.TEXT_MEMORY_MAX_CHARS) {
        alert(`Memory is too long (${t.length}/${LIMITS.TEXT_MEMORY_MAX_CHARS} characters).`);
        return;
      }
    }

    if (caption.length > LIMITS.CAPTION_MAX_CHARS) {
      alert(`Caption is too long (max ${LIMITS.CAPTION_MAX_CHARS} characters).`);
      return;
    }

    if (formType !== 'text') {
      if (!mediaFile) {
        alert('Please choose a file before saving.');
        return;
      }
      const max = fileMaxFor(formType);
      if (mediaFile.size > max) {
        alert(`File is ${bytesToReadable(mediaFile.size)}. Maximum for ${formType}s is ${bytesToReadable(max)}.`);
        return;
      }
      const allowed = allowedTypesFor(formType);
      if (mediaFile.type && !allowed.includes(mediaFile.type)) {
        alert(`File type "${mediaFile.type}" isn't supported for ${formType}s.`);
        return;
      }
    }

    setUploading(true);
    try {
      let mediaUrl: string | null = null;

      if (mediaFile && (formType === 'photo' || formType === 'video' || formType === 'voice')) {
        let toUpload: File = mediaFile;
        if (formType === 'photo') {
          setUploadStage('Compressing photo…');
          toUpload = await compressImage(mediaFile);
        }
        setUploadStage('Uploading…');
        setUploadPct(0);
        const fd = new FormData();
        fd.append('file', toUpload);
        fd.append('slug', archive.share_slug);
        fd.append('memory_type', formType);
        const result = await uploadWithProgress('/api/upload', fd, (pct) => setUploadPct(pct));
        if (!result.ok) {
          throw new Error(result.error || 'Upload failed');
        }
        mediaUrl = (result.data as { url?: string })?.url || null;
        setUploadStage('Saving…');
      }

      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_slug: archive.share_slug,
          author_name: authorName.trim(),
          author_email: authorEmail.trim() || null,
          memory_type: formType,
          text_content: formType === 'text' ? textContent : null,
          media_url: mediaUrl,
          caption: caption || null,
          is_last_words: isLastWords,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save memory');
      }

      const newMemory = await res.json();
      setMemories([newMemory, ...memories]);
      closeForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Could not save: ' + message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={themeToStyle(theme)} className="min-h-screen [min-height:100dvh]">
    <div className="max-w-2xl mx-auto px-6 pt-12 pb-32">
      {/* Cover */}
      <div className="text-center pt-12 pb-14 border-b border-line mb-12">
        <div className="w-44 h-44 mx-auto mb-8 rounded-full bg-warm overflow-hidden flex items-center justify-center border border-line">
          {archive.cover_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={archive.cover_photo_url} alt={archive.subject_name} className="w-full h-full object-cover" />
          ) : (
            <span className="serif text-5xl text-subtle">{initial}</span>
          )}
        </div>
        <div className="serif italic text-muted text-lg mb-4 tracking-wide">in memory of</div>
        <h1 className="serif font-medium text-5xl leading-tight tracking-tight mb-5">
          {archive.subject_name}
        </h1>
        {archive.subject_dates && (
          <div className="text-muted text-base tracking-wider">{archive.subject_dates}</div>
        )}
      </div>

      {/* Add bar — voice-first per PHILOSOPHY.md */}
      <div className="bg-white border border-line rounded-2xl p-6 mb-10">
        <div className="serif text-xl font-medium mb-1">Tell us about {archive.subject_name}</div>
        <div className="text-muted text-sm mb-5">
          Voice notes carry the most. Old photos, short stories, anything that comes to mind.
        </div>

        {/* Primary: voice */}
        <button
          onClick={() => openForm('voice')}
          className="w-full bg-ink text-white rounded-xl px-6 py-5 mb-3 hover:bg-accent-dark transition-colors flex items-center justify-center gap-3"
        >
          <span className="text-xl">●</span>
          <span className="font-medium text-base">Share a voice memory</span>
        </button>

        {/* Secondary actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => openForm('text')} className="border border-line bg-cream rounded-xl px-3 py-3 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
            Write
          </button>
          <button onClick={() => openForm('photo')} className="border border-line bg-cream rounded-xl px-3 py-3 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
            Photo
          </button>
          <button onClick={() => openForm('video')} className="border border-line bg-cream rounded-xl px-3 py-3 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
            Video
          </button>
        </div>
      </div>

      {/* Form */}
      {formOpen && (
        <div className="bg-white border border-line rounded-2xl p-7 mb-6">
          <div className="serif text-2xl font-medium mb-5">
            {formType === 'text' && 'Write a story'}
            {formType === 'photo' && 'Share a photo'}
            {formType === 'voice' && 'Share a voice recording'}
            {formType === 'video' && 'Share a video'}
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Your name</label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="So we know who shared this"
                className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 focus:border-accent focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                Email <span className="text-subtle normal-case font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={authorEmail}
                onChange={e => setAuthorEmail(e.target.value)}
                placeholder="So the family can reach you"
                className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 focus:border-accent focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {formType === 'text' && (
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Memory</label>
              <textarea
                value={textContent}
                onChange={e => setTextContent(e.target.value.slice(0, LIMITS.TEXT_MEMORY_MAX_CHARS))}
                placeholder="Tell the story in your own words. There's no right way."
                className="w-full min-h-[160px] border border-line bg-cream rounded-lg px-3.5 py-3 serif text-base leading-relaxed focus:border-accent focus:bg-white focus:outline-none resize-y"
              />
              <div className="text-xs text-subtle mt-1 text-right">
                {textContent.length} / {LIMITS.TEXT_MEMORY_MAX_CHARS}
              </div>
            </div>
          )}

          {formType === 'voice' && !mediaFile && (
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                Record now
              </label>
              <VoiceRecorder
                disabled={uploading}
                onRecorded={(file) => {
                  setMediaFile(file);
                }}
              />
              <p className="text-xs text-subtle italic mt-3 text-center">
                Or upload an existing recording &darr;
              </p>
            </div>
          )}

          {(formType === 'photo' || formType === 'video' || formType === 'voice') && (
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                {formType === 'photo' && 'Photo'}
                {formType === 'video' && 'Video'}
                {formType === 'voice' && (mediaFile ? 'Your recording' : 'Or choose an existing audio file')}
              </label>
              <label className="block border-2 border-dashed border-line rounded-lg py-8 text-center text-muted cursor-pointer hover:border-accent hover:bg-warm transition-colors min-h-[88px]">
                {mediaFile ? `${mediaFile.name} — tap to change` : (formType === 'photo' ? 'Tap to take a photo or choose one' : formType === 'video' ? 'Tap to record a video or choose one' : 'Tap to choose an audio file')}
                <input
                  type="file"
                  accept={formType === 'photo' ? 'image/*' : formType === 'video' ? 'video/*' : 'audio/*'}
                  capture={formType === 'photo' ? 'environment' : formType === 'video' ? 'environment' : undefined}
                  onChange={e => setMediaFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-subtle mt-1">
                Max {bytesToReadable(fileMaxFor(formType))}.
                {mediaFile && ` Selected: ${bytesToReadable(mediaFile.size)}.`}
              </div>
            </div>
          )}

          {(formType === 'photo' || formType === 'video' || formType === 'voice') && (
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Caption (optional)</label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder={formType === 'voice' ? 'e.g. "Grandpa telling the story about his first car"' : 'Where, when, or what this means'}
                className="w-full border border-line bg-cream rounded-lg px-3.5 py-3 focus:border-accent focus:bg-white focus:outline-none"
              />
            </div>
          )}

          <div className="mb-5 bg-warm/40 border border-line rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isLastWords}
                onChange={e => setIsLastWords(e.target.checked)}
                className="mt-1 w-4 h-4 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">This is something they actually said</div>
                <div className="text-xs text-muted mt-1 leading-relaxed">
                  Mark this if you&rsquo;re sharing real words from {archive.subject_name} — something they said, wrote, or recorded. We honor these in their own section.
                </div>
              </div>
            </label>
          </div>

          {uploading && uploadStage && (
            <div className="mt-4 mb-2 bg-warm/40 border border-line rounded-lg p-3">
              <div className="flex justify-between items-center text-xs text-muted mb-2">
                <span>{uploadStage}</span>
                {uploadPct > 0 && uploadStage === 'Uploading…' && <span>{uploadPct}%</span>}
              </div>
              {uploadStage === 'Uploading…' && (
                <div className="w-full bg-cream rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all duration-200"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Sticky submit row — stays in view above mobile keyboard */}
          <div className="sticky bottom-0 -mx-7 px-7 pt-4 pb-5 mt-5 bg-white border-t border-line flex gap-3">
            <button
              onClick={closeForm}
              disabled={uploading}
              className="px-5 py-3 rounded-lg text-muted hover:text-ink font-medium transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 px-5 py-3 rounded-lg bg-ink text-white font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed transition-colors min-h-[48px]"
            >
              {uploading ? 'Saving…' : 'Save memory'}
            </button>
          </div>
        </div>
      )}

      {/* Last Words — sacred, shown first */}
      {memories.some(m => m.is_last_words) && (
        <>
          <div className="mb-5">
            <h2 className="serif text-2xl font-medium flex items-baseline gap-3">
              <span>Last words</span>
              <span className="text-sm text-muted font-sans font-normal">
                ({memories.filter(m => m.is_last_words).length})
              </span>
            </h2>
            <p className="serif italic text-sm text-muted mt-1">
              Their own words, kept by the people who heard them.
            </p>
          </div>
          <div className="space-y-4 mb-12">
            {memories.filter(m => m.is_last_words).map(m => (
              <div key={m.id} className="border-l-4 border-accent pl-4">
                <MemoryCard memory={m} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Memories — everything else */}
      <h2 className="serif text-2xl font-medium mb-5 flex items-baseline gap-3">
        <span>Memories shared</span>
        {memories.filter(m => !m.is_last_words).length > 0 && (
          <span className="text-sm text-muted font-sans font-normal">
            ({memories.filter(m => !m.is_last_words).length})
          </span>
        )}
      </h2>

      {memories.filter(m => !m.is_last_words).length === 0 ? (
        <div className="text-center py-12 text-muted serif italic text-lg">
          {memories.length === 0 ? <>No memories yet.<br />Be the first to share one.</> : 'No other memories yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {memories.filter(m => !m.is_last_words).map(m => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}

      <CandleSection
        archiveSlug={archive.share_slug}
        subjectName={archive.subject_name}
      />

      <WallSection
        archiveSlug={archive.share_slug}
        subjectName={archive.subject_name}
      />

      <HonorSection
        archiveSlug={archive.share_slug}
        subjectName={archive.subject_name}
        donationCharityName={archive.donation_charity_name}
        donationUrl={archive.donation_url}
        donationNote={archive.donation_note}
      />

      <footer
        className="mt-20 pt-10 border-t border-line text-center text-xs text-subtle"
        style={homeBranding?.brand_color ? { ['--brand-accent' as string]: homeBranding.brand_color } : undefined}
      >
        {homeBranding && (
          <div className="mb-6">
            {homeBranding.logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={homeBranding.logo_url}
                alt={homeBranding.name}
                className="max-h-16 mx-auto mb-3 object-contain"
              />
            )}
            <p className="serif text-base text-ink mb-1">In care of {homeBranding.name}</p>
            {homeBranding.tagline && (
              <p className="serif italic text-xs text-muted">{homeBranding.tagline}</p>
            )}
          </div>
        )}
        {(archive as { package_price_label?: string | null }).package_price_label && (
          <p className="serif italic text-sm text-muted mb-3">
            {(archive as { package_price_label?: string | null }).package_price_label} &mdash; included with your service.
          </p>
        )}
        <p className="serif italic text-base text-muted mb-2">A quiet place to gather what matters.</p>
        <p>Kept for generations.</p>
        <p className="mt-6">
          <a
            href={`/api/archives/${archive.share_slug}/export`}
            className="serif italic text-muted hover:text-ink underline underline-offset-4 decoration-line hover:decoration-ink"
          >
            Download a copy of this archive
          </a>
        </p>
        <p className="text-[11px] text-subtle mt-2 max-w-md mx-auto leading-relaxed">
          Your permanent copy &mdash; photos, voice notes, videos, and an offline-readable webpage.
          Keep it on a backup drive, share it with family, save it forever.
        </p>
      </footer>
    </div>

    <ThemePicker
      archiveSlug={archive.share_slug}
      currentTheme={theme}
      onThemeChange={setTheme}
    />
    <PWAInstallPrompt />
    </div>
  );
}

function MemoryCard({ memory }: { memory: Memory }) {
  const date = new Date(memory.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white border border-line rounded-2xl p-6">
      <div className="flex justify-between items-baseline mb-3 gap-3 flex-wrap">
        <span className="font-semibold text-sm">{memory.author_name || 'Someone'}</span>
        <span className="text-xs text-subtle tracking-wide">{date}</span>
      </div>

      {memory.memory_type === 'text' && (
        <div className="serif text-lg leading-relaxed whitespace-pre-wrap break-words">
          {memory.text_content}
        </div>
      )}

      {memory.memory_type === 'photo' && memory.media_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={memory.media_url} alt={memory.caption || ''} className="rounded-lg w-full" />
          {memory.caption && <div className="serif italic text-muted text-base mt-3">{memory.caption}</div>}
        </>
      )}

      {memory.memory_type === 'video' && memory.media_url && (
        <>
          <video src={memory.media_url} controls className="rounded-lg w-full max-h-[500px] bg-black" />
          {memory.caption && <div className="serif italic text-muted text-base mt-3">{memory.caption}</div>}
        </>
      )}

      {memory.memory_type === 'voice' && memory.media_url && (
        <>
          <audio src={memory.media_url} controls className="w-full" />
          {memory.caption && <div className="serif italic text-muted text-base mt-3">{memory.caption}</div>}
        </>
      )}
    </div>
  );
}
