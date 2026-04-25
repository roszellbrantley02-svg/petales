'use client';

import { useState } from 'react';
import type { Archive, Memory, MemoryType } from '@/lib/types';
import { LIMITS, fileMaxFor, allowedTypesFor, bytesToReadable } from '@/lib/limits';
import HonorSection from './HonorSection';

interface Props {
  archive: Archive;
  initialMemories: Memory[];
}

export default function FamilyArchiveClient({ archive, initialMemories }: Props) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<MemoryType>('text');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const initial = (archive.subject_name || 'M').charAt(0).toUpperCase();

  function openForm(type: MemoryType) {
    setFormType(type);
    setFormOpen(true);
    setTextContent('');
    setCaption('');
    setMediaFile(null);
  }

  function closeForm() {
    setFormOpen(false);
    setAuthorName('');
    setAuthorEmail('');
    setTextContent('');
    setCaption('');
    setMediaFile(null);
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
        const fd = new FormData();
        fd.append('file', mediaFile);
        fd.append('slug', archive.share_slug);
        fd.append('memory_type', formType);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Upload failed');
        }
        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
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

      {/* Add bar */}
      <div className="bg-white border border-line rounded-2xl p-6 mb-10">
        <div className="serif text-xl font-medium mb-1">Share a memory</div>
        <div className="text-muted text-sm mb-5">
          A story, a photo, a voice — anything you want to remember.
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <button onClick={() => openForm('text')} className="border border-line bg-cream rounded-xl px-3 py-4 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
            Write
          </button>
          <button onClick={() => openForm('photo')} className="border border-line bg-cream rounded-xl px-3 py-4 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
            Photo
          </button>
          <button onClick={() => openForm('voice')} className="border border-line bg-cream rounded-xl px-3 py-4 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
            Voice
          </button>
          <button onClick={() => openForm('video')} className="border border-line bg-cream rounded-xl px-3 py-4 font-medium text-sm hover:bg-warm hover:border-accent transition-colors">
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

          {(formType === 'photo' || formType === 'video' || formType === 'voice') && (
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                {formType === 'photo' && 'Photo'}
                {formType === 'video' && 'Video'}
                {formType === 'voice' && 'Audio recording'}
              </label>
              <label className="block border-2 border-dashed border-line rounded-lg py-6 text-center text-muted cursor-pointer hover:border-accent hover:bg-warm transition-colors">
                {mediaFile ? `${mediaFile.name} — click to change` : 'Click to choose a file'}
                <input
                  type="file"
                  accept={formType === 'photo' ? 'image/*' : formType === 'video' ? 'video/*' : 'audio/*'}
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

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="px-5 py-3 rounded-lg bg-ink text-white font-medium hover:bg-accent-dark disabled:bg-subtle disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Saving…' : 'Save memory'}
            </button>
            <button
              onClick={closeForm}
              disabled={uploading}
              className="px-5 py-3 rounded-lg text-muted hover:text-ink font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memories */}
      <h2 className="serif text-2xl font-medium mb-5 flex items-baseline gap-3">
        <span>Memories shared</span>
        {memories.length > 0 && <span className="text-sm text-muted font-sans font-normal">({memories.length})</span>}
      </h2>

      {memories.length === 0 ? (
        <div className="text-center py-12 text-muted serif italic text-lg">
          No memories yet.<br />Be the first to share one.
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map(m => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}

      <HonorSection
        archiveSlug={archive.share_slug}
        subjectName={archive.subject_name}
        donationCharityName={archive.donation_charity_name}
        donationUrl={archive.donation_url}
        donationNote={archive.donation_note}
      />

      <footer className="mt-20 pt-10 border-t border-line text-center text-xs text-subtle">
        <p className="serif italic text-base text-muted mb-2">A quiet place to gather what matters.</p>
        <p>Kept for generations.</p>
      </footer>
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
