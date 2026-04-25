'use client';

import { useState } from 'react';
import {
  CATEGORY_ORDER,
  MARKETPLACE_CATEGORIES,
  itemsByCategory,
  type MarketplaceCategory,
} from '@/lib/marketplace';

interface Props {
  archiveSlug: string;
  subjectName: string;
  donationCharityName?: string | null;
  donationUrl?: string | null;
  donationNote?: string | null;
}

export default function HonorSection({
  archiveSlug,
  subjectName,
  donationCharityName,
  donationUrl,
  donationNote,
}: Props) {
  const [openCategory, setOpenCategory] = useState<MarketplaceCategory | null>(null);
  const firstName = subjectName.split(' ')[0];
  const hasCustomDonation = Boolean(donationUrl && donationCharityName);

  // The categories shown — donation collapses if family has a custom one
  const displayedCategories = CATEGORY_ORDER;

  function clickUrl(itemId: string): string {
    return `/api/marketplace/click?slug=${encodeURIComponent(archiveSlug)}&item=${encodeURIComponent(itemId)}`;
  }

  return (
    <section className="mt-16 pt-12 border-t border-line">
      <div className="text-center mb-8">
        <p className="serif italic text-muted text-sm mb-2">In their memory</p>
        <h2 className="serif text-3xl font-medium tracking-tight">
          Ways to honor {firstName}
        </h2>
      </div>

      {/* Custom donation — if the family has chosen a charity, lead with it */}
      {hasCustomDonation && (
        <div className="bg-warm border border-line rounded-2xl p-6 mb-6 text-center">
          <p className="serif italic text-muted text-sm mb-2">In lieu of flowers</p>
          <p className="serif text-xl mb-3">
            The family has asked that gifts be made to <strong className="text-ink">{donationCharityName}</strong>.
          </p>
          {donationNote && (
            <p className="text-muted text-sm italic mb-4 max-w-md mx-auto">{donationNote}</p>
          )}
          <a
            href={clickUrl('donation')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-ink text-white font-medium hover:bg-accent-dark transition-colors"
          >
            Make a donation →
          </a>
        </div>
      )}

      <div className="space-y-2">
        {displayedCategories.map(cat => {
          // If family has a custom donation, skip the curated donation section
          if (cat === 'donation' && hasCustomDonation) return null;

          const items = itemsByCategory(cat);
          if (items.length === 0) return null;

          const meta = MARKETPLACE_CATEGORIES[cat];
          const isOpen = openCategory === cat;

          return (
            <div key={cat} className="bg-white border border-line rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-warm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="serif text-xl text-accent">{meta.icon}</span>
                  <div>
                    <div className="serif text-lg font-medium">{meta.label}</div>
                    <div className="text-muted text-xs">{meta.blurb}</div>
                  </div>
                </div>
                <span className={`text-muted text-sm transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                  →
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-line bg-cream p-4 space-y-2">
                  {items.map(item => (
                    <a
                      key={item.id}
                      href={clickUrl(item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between items-start gap-3 p-3 bg-white border border-line rounded-lg hover:border-accent transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm group-hover:text-accent transition-colors">
                          {item.vendor}
                          {item.featured && (
                            <span className="ml-2 text-xs text-accent font-medium">Recommended</span>
                          )}
                        </div>
                        <div className="text-muted text-xs mt-0.5">{item.description}</div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        {item.price_range && (
                          <div className="text-xs text-subtle whitespace-nowrap">{item.price_range}</div>
                        )}
                        <div className="text-xs text-accent mt-1">Visit →</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-subtle italic mt-6">
        Petales receives a small commission from some partner links. The family pays nothing extra.
      </p>
    </section>
  );
}
