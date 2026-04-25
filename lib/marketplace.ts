// ——————————————————————————————————————————————————
// Petales Marketplace
//
// Curated, tasteful options shown on the family-facing archive page.
// Framing: "Ways to honor them" — never "buy stuff."
//
// Each item links out via /api/marketplace/click which tracks the
// click and redirects to the vendor. This lets us swap real affiliate
// URLs server-side without code changes.
//
// To make an item earn revenue:
//   1. Sign up for the vendor's affiliate program (Impact, CJ, ShareASale, etc.)
//   2. Replace the `url` here with your tracked affiliate link
//   3. Optionally set `commission` so we know the rate
// ——————————————————————————————————————————————————

export type MarketplaceCategory =
  | 'flowers'
  | 'donation'
  | 'tree'
  | 'book'
  | 'sympathy'
  | 'jewelry';

export interface MarketplaceItem {
  id: string;
  category: MarketplaceCategory;
  vendor: string;
  description: string;
  url: string;
  price_range?: string;
  // For tracking & potential revenue
  commission?: string;
  // Show this prominently if true
  featured?: boolean;
}

export const MARKETPLACE_CATEGORIES: Record<MarketplaceCategory, {
  label: string;
  icon: string;
  blurb: string;
}> = {
  flowers: {
    label: 'Send flowers',
    icon: '✿',
    blurb: 'Sympathy arrangements delivered to the family or service.',
  },
  donation: {
    label: 'Make a donation',
    icon: '◆',
    blurb: 'Honor their memory by giving to a cause they cared about.',
  },
  tree: {
    label: 'Plant a memorial tree',
    icon: '✦',
    blurb: 'A living tribute that grows for generations.',
  },
  book: {
    label: 'Order a printed memorial book',
    icon: '✎',
    blurb: 'Turn the archive into something the family can hold.',
  },
  sympathy: {
    label: 'Send a sympathy gift',
    icon: '◌',
    blurb: 'A care package, a meal, or a quiet note.',
  },
  jewelry: {
    label: 'Memorial keepsake',
    icon: '○',
    blurb: 'Lasting jewelry or art created in their memory.',
  },
};

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // ——— Flowers ———
  {
    id: 'flowers-1800',
    category: 'flowers',
    vendor: '1-800-Flowers',
    description: 'Wide selection of sympathy arrangements with same-day delivery in most areas.',
    url: 'https://www.1800flowers.com/sympathy',
    price_range: '$45–$200',
    featured: true,
  },
  {
    id: 'flowers-bouqs',
    category: 'flowers',
    vendor: 'The Bouqs Co.',
    description: 'Farm-direct sympathy bouquets, simple and elegant.',
    url: 'https://bouqs.com',
    price_range: '$50–$120',
  },
  {
    id: 'flowers-urbanstems',
    category: 'flowers',
    vendor: 'UrbanStems',
    description: 'Modern sympathy arrangements with overnight shipping.',
    url: 'https://urbanstems.com',
    price_range: '$55–$180',
  },

  // ——— Memorial trees ———
  {
    id: 'tree-onetree',
    category: 'tree',
    vendor: 'One Tree Planted',
    description: 'A donation that plants real trees in their memory — choose region.',
    url: 'https://onetreeplanted.org',
    price_range: '$1+ per tree',
    featured: true,
  },
  {
    id: 'tree-livingurn',
    category: 'tree',
    vendor: 'A Living Tribute',
    description: 'Plant a tree in a national forest in their name with a personalized certificate.',
    url: 'https://www.alivingtribute.org',
    price_range: '$60+',
  },

  // ——— Memorial book ———
  {
    id: 'book-lulu',
    category: 'book',
    vendor: 'Lulu',
    description: 'Print-on-demand hardcover books — eventually integrated with the archive itself.',
    url: 'https://lulu.com',
    price_range: '$25–$80',
    featured: true,
  },
  {
    id: 'book-blurb',
    category: 'book',
    vendor: 'Blurb',
    description: 'Photo-rich hardcover memorial books, lay-flat binding available.',
    url: 'https://blurb.com',
    price_range: '$40–$120',
  },

  // ——— Sympathy gifts ———
  {
    id: 'sympathy-postable',
    category: 'sympathy',
    vendor: 'Postable',
    description: 'Beautiful handwritten-style sympathy cards mailed for you.',
    url: 'https://postable.com',
    price_range: '$3+',
  },
  {
    id: 'sympathy-greatful',
    category: 'sympathy',
    vendor: 'Greatful',
    description: 'Comfort food and meal delivery for grieving households.',
    url: 'https://greatful.com',
    price_range: '$30+',
  },

  // ——— Memorial keepsakes ———
  {
    id: 'jewelry-eterneva',
    category: 'jewelry',
    vendor: 'Eterneva',
    description: 'Lab-grown diamonds created from a small amount of ash or hair.',
    url: 'https://eterneva.com',
    price_range: '$3,000+',
  },
  {
    id: 'jewelry-partingstone',
    category: 'jewelry',
    vendor: 'Parting Stone',
    description: 'Solidified remains as smooth, polished stones — alternative to traditional ashes.',
    url: 'https://partingstone.com',
    price_range: '$695+',
  },
];

// Group items by category, with featured first
export function itemsByCategory(category: MarketplaceCategory): MarketplaceItem[] {
  return MARKETPLACE_ITEMS
    .filter(i => i.category === category)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
}

export function getItem(id: string): MarketplaceItem | null {
  return MARKETPLACE_ITEMS.find(i => i.id === id) || null;
}

// All categories in display order
export const CATEGORY_ORDER: MarketplaceCategory[] = [
  'donation',  // Most-honored honoring action goes first
  'flowers',
  'tree',
  'book',
  'sympathy',
  'jewelry',
];
