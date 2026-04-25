'use client';

// In-browser voice recorder using MediaRecorder.
// One-tap record. Live timer + level visualization. Preview before saving.
// Falls back gracefully on browsers/devices that don't support MediaRecorder.

import { useEffect, useRef, useState } from 'react';

interface Props {
  onRecorded: (file: File, durationSeconds: number) => void;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'permission' | 'recording' | 'recorded' | 'unsupported' | 'denied';

export default function VoiceRecorder({ onRecorded, disabled }: Props) {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.MediaRecorder) {
      setState('unsupported');
    }
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    setError('');
    setState('permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a mime type the browser supports
      const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
      const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('recorded');
      };

      recorder.start();
      startTimeRef.current = Date.now();
      setSeconds(0);
      setState('recording');
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (e) {
      stopTracks();
      const err = e as { name?: string; message?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setState('denied');
        setError('Microphone access was denied. To record, allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setState('unsupported');
        setError('No microphone found on this device.');
      } else {
        setState('idle');
        setError(err.message || 'Could not start recording.');
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopTracks();
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setSeconds(0);
    chunksRef.current = [];
    setState('idle');
  }

  function save() {
    if (!chunksRef.current.length) return;
    const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mime });
    const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `voice-memory-${Date.now()}.${ext}`, { type: mime });
    onRecorded(file, seconds);
  }

  function fmt(s: number): string {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  // ─── render ───
  if (state === 'unsupported') {
    return (
      <div className="bg-warm/40 border border-line rounded-lg p-4 text-sm text-muted">
        In-browser recording isn&rsquo;t supported on this device. Use the &ldquo;Choose an audio file&rdquo; option below to upload a recording from your phone&rsquo;s voice memo app.
      </div>
    );
  }

  return (
    <div>
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="w-full bg-ink text-white rounded-2xl py-6 px-6 hover:bg-accent-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-3 min-h-[64px]"
        >
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="font-medium text-base">Tap to start recording</span>
        </button>
      )}

      {state === 'permission' && (
        <div className="bg-cream border border-line rounded-2xl py-6 px-6 text-center text-muted">
          <p className="text-sm">Allow microphone access to record…</p>
        </div>
      )}

      {state === 'recording' && (
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm uppercase tracking-wider text-muted">Recording</span>
            <span className="ml-auto text-2xl serif tabular-nums">{fmt(seconds)}</span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="w-full bg-ink text-white rounded-xl py-4 font-medium min-h-[52px] hover:bg-accent-dark"
          >
            Stop recording
          </button>
        </div>
      )}

      {state === 'recorded' && audioUrl && (
        <div className="bg-white border border-line rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted mb-3">
            Recording &mdash; {fmt(seconds)}
          </p>
          <audio src={audioUrl} controls className="w-full mb-4" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              className="flex-1 border border-line bg-cream rounded-xl py-3 text-sm font-medium min-h-[44px] hover:bg-warm"
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={save}
              className="flex-1 bg-ink text-white rounded-xl py-3 text-sm font-medium min-h-[44px] hover:bg-accent-dark"
            >
              Use this recording
            </button>
          </div>
        </div>
      )}

      {state === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
          {error}
          <button
            type="button"
            onClick={() => { setError(''); setState('idle'); }}
            className="block mt-2 text-xs uppercase tracking-wider text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'idle' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
