'use client';

// Subtle "Add to Home Screen" prompt for the family page. Shown after a few
// seconds on mobile if the browser supports installation, dismissible.
// Quietly disappears on desktop and on already-installed apps.

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 8 seconds — give the user time to engage with the page first
      setTimeout(() => setShow(true), 8000);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setShow(false);
  }

  function dismiss() {
    setShow(false);
    // Remember the dismissal for this session
    try { sessionStorage.setItem('petales_pwa_dismissed', '1'); } catch {}
  }

  // Don't show if dismissed this session
  useEffect(() => {
    try {
      if (sessionStorage.getItem('petales_pwa_dismissed') === '1') setShow(false);
    } catch {}
  }, []);

  if (!show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-line rounded-2xl shadow-lg p-4 z-40">
      <p className="serif text-sm text-ink mb-1">Save Petales to your home screen?</p>
      <p className="text-xs text-muted mb-3 leading-relaxed">
        So you can come back to this archive easily &mdash; no app store, no logins.
      </p>
      <div className="flex gap-2">
        <button
          onClick={dismiss}
          className="flex-1 text-xs text-muted px-3 py-2 hover:text-ink min-h-[40px]"
        >
          Not now
        </button>
        <button
          onClick={install}
          className="flex-1 bg-ink text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-accent-dark min-h-[40px]"
        >
          Add to home screen
        </button>
      </div>
    </div>
  );
}
