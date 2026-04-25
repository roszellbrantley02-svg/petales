'use client';

import { useState } from 'react';
import { ALL_THEMES, THEMES, THEME_LABELS, THEME_DESCRIPTIONS, type ThemeId } from '@/lib/themes';

interface Props {
  archiveSlug: string;
  currentTheme: string;
  onThemeChange: (theme: ThemeId) => void;
}

export default function ThemePicker({ archiveSlug, currentTheme, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(theme: ThemeId) {
    onThemeChange(theme);  // Update UI immediately
    setSaving(true);
    try {
      await fetch(`/api/archives/${archiveSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="bg-white border border-line rounded-2xl shadow-xl p-4 mb-2 w-72 max-h-[480px] overflow-y-auto">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <div className="serif text-base font-medium">Personalize this page</div>
              <div className="text-xs text-muted">Pick a color for the family</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted hover:text-ink text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-1.5">
            {ALL_THEMES.map(t => {
              const theme = THEMES[t];
              const isCurrent = currentTheme === t;
              return (
                <button
                  key={t}
                  onClick={() => pick(t)}
                  disabled={saving}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                    isCurrent ? 'bg-warm border border-accent' : 'border border-transparent hover:bg-warm'
                  }`}
                >
                  <div className="flex gap-1 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full border border-black/10" style={{ background: theme.bg }}></div>
                    <div className="w-5 h-5 rounded-full border border-black/10" style={{ background: theme.accent }}></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {THEME_LABELS[t]}
                      {isCurrent && <span className="text-xs text-accent ml-2">·  current</span>}
                    </div>
                    <div className="text-xs text-muted italic truncate">{THEME_DESCRIPTIONS[t]}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-subtle italic mt-3 text-center">
            The whole family sees the color you pick.
          </p>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="bg-white border border-line rounded-full shadow-md p-3 hover:shadow-lg hover:border-accent transition-all flex items-center gap-2 text-sm font-medium"
        title="Personalize this page"
      >
        <span className="w-4 h-4 rounded-full" style={{ background: THEMES[currentTheme as ThemeId]?.accent || THEMES.cream.accent }}></span>
        {open ? 'Close' : 'Personalize'}
      </button>
    </div>
  );
}
