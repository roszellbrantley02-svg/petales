// ——————————————————————————————————————————————————
// Momo — Limits & Caps
//
// One file. Change a number here, redeploy, and the whole system
// honors the new limit. Designed for cost-conscious early testing.
//
// When you land your first paying customer, raise GENERATIONS_PER_MONTH_HARD_CAP
// and the per-day numbers. Everything else can stay.
// ——————————————————————————————————————————————————

export const LIMITS = {
  // ——— File upload caps ———
  PHOTO_MAX_BYTES: 3 * 1024 * 1024,   // 3 MB
  VIDEO_MAX_BYTES: 20 * 1024 * 1024,  // 20 MB
  AUDIO_MAX_BYTES: 10 * 1024 * 1024,  // 10 MB

  // ——— Text input caps ———
  TEXT_MEMORY_MAX_CHARS: 5_000,
  CAPTION_MAX_CHARS: 300,
  AUTHOR_NAME_MAX_CHARS: 100,
  AUTHOR_NAME_MIN_CHARS: 1,
  SUBJECT_NAME_MAX_CHARS: 200,
  SUBJECT_DATES_MAX_CHARS: 60,

  // ——— Per-archive limits ———
  MEMORIES_PER_ARCHIVE: 50,

  // ——— AI generation caps (cost control) ———
  GENERATION_MAX_OUTPUT_TOKENS: 1024,
  GENERATIONS_PER_ARCHIVE_PER_DAY: 30,
  GENERATIONS_PER_DAY_GLOBAL: 50,

  // ——— THE HARD CIRCUIT BREAKER ———
  // No matter what, this many generations and we stop.
  // The only way past this is to edit this file and redeploy.
  // This is your insurance against runaway costs from bugs, abuse, or compromise.
  GENERATIONS_PER_MONTH_HARD_CAP: 500,

  // ——— Email broadcaster caps (cost & abuse control) ———
  ANNOUNCEMENT_SUBJECT_MAX_CHARS: 200,
  ANNOUNCEMENT_BODY_MAX_CHARS: 5_000,
  RECIPIENTS_PER_ANNOUNCEMENT_MAX: 100,
  ANNOUNCEMENTS_PER_ARCHIVE_PER_DAY: 5,
  ANNOUNCEMENTS_PER_DAY_GLOBAL: 50,

  // Hard cap — stops Resend bill blowup completely
  ANNOUNCEMENTS_PER_MONTH_HARD_CAP: 200,
  EMAILS_PER_MONTH_HARD_CAP: 2_000,  // Resend free tier is 3,000/mo

  // ——— Wall + Candles ———
  WALL_NOTE_MAX_CHARS: 280,
  WALL_AUTHOR_MAX_CHARS: 80,
  WALL_NOTES_PER_ARCHIVE_MAX: 10_000,
  CANDLE_DEDICATION_MAX_CHARS: 140,
  CANDLES_PER_ARCHIVE_MAX: 100_000,

  // ——— Allowed MIME types ———
  ALLOWED_PHOTO_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska',
  ],
  ALLOWED_AUDIO_TYPES: [
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
  ],
} as const;

// ——— Helpers ———

export function bytesToReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileMaxFor(memoryType: 'photo' | 'video' | 'voice'): number {
  switch (memoryType) {
    case 'photo': return LIMITS.PHOTO_MAX_BYTES;
    case 'video': return LIMITS.VIDEO_MAX_BYTES;
    case 'voice': return LIMITS.AUDIO_MAX_BYTES;
  }
}

export function allowedTypesFor(memoryType: 'photo' | 'video' | 'voice'): readonly string[] {
  switch (memoryType) {
    case 'photo': return LIMITS.ALLOWED_PHOTO_TYPES;
    case 'video': return LIMITS.ALLOWED_VIDEO_TYPES;
    case 'voice': return LIMITS.ALLOWED_AUDIO_TYPES;
  }
}
