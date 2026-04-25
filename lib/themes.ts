// ——————————————————————————————————————————————————
// Petales Themes
//
// Each archive's family can pick a color palette that feels right
// for their loved one. Themes are applied to the family-facing page
// via inline CSS variables on the root <body>.
//
// Adding a new theme: add an entry below + a label in THEME_LABELS.
// All themes share the same variable names so the page works regardless.
// ——————————————————————————————————————————————————

import type { CSSProperties } from 'react';

export type ThemeId =
  | 'cream'      // default — warm cream + bronze
  | 'garden'     // soft pinks + mauve
  | 'forest'     // sage greens + earth
  | 'dusk'       // soft purples + indigo
  | 'ocean'      // gentle blues + teal
  | 'earth'      // warm browns + ochre
  | 'midnight';  // deep blue/black for evening, mourning

export interface Theme {
  bg: string;          // Page background
  surface: string;     // Card/panel background
  ink: string;         // Primary text
  muted: string;       // Secondary text
  subtle: string;      // Tertiary text
  line: string;        // Borders, dividers
  accent: string;      // Buttons, links, highlights
  accentDark: string;  // Hover state for accent
  warm: string;        // Highlight/emphasis backgrounds
}

export const THEMES: Record<ThemeId, Theme> = {
  cream: {
    bg: '#faf8f4',
    surface: '#ffffff',
    ink: '#2a2623',
    muted: '#6b6258',
    subtle: '#a89e92',
    line: '#e8e2d6',
    accent: '#8b6f47',
    accentDark: '#6d5638',
    warm: '#f0e8d8',
  },
  garden: {
    bg: '#fbf5f3',
    surface: '#ffffff',
    ink: '#3a2628',
    muted: '#7a5e62',
    subtle: '#b89aa0',
    line: '#ecd9da',
    accent: '#a05868',
    accentDark: '#7e3f4d',
    warm: '#f5dfe1',
  },
  forest: {
    bg: '#f3f6f1',
    surface: '#ffffff',
    ink: '#1f2c20',
    muted: '#506653',
    subtle: '#9bafa0',
    line: '#d6e0d4',
    accent: '#5d7a56',
    accentDark: '#3f5639',
    warm: '#dde8d8',
  },
  dusk: {
    bg: '#f3f1f7',
    surface: '#ffffff',
    ink: '#241f33',
    muted: '#5a4f72',
    subtle: '#9c92b3',
    line: '#dad3e7',
    accent: '#6f5a98',
    accentDark: '#4d3e72',
    warm: '#e0d7ee',
  },
  ocean: {
    bg: '#eef4f6',
    surface: '#ffffff',
    ink: '#1a2a33',
    muted: '#4d6a76',
    subtle: '#90a8b3',
    line: '#cfe0e6',
    accent: '#3e7388',
    accentDark: '#27566a',
    warm: '#d1e4ec',
  },
  earth: {
    bg: '#f8f1e8',
    surface: '#fffaf2',
    ink: '#332518',
    muted: '#6b5a45',
    subtle: '#a99882',
    line: '#e6d5bd',
    accent: '#a06d2c',
    accentDark: '#7a521f',
    warm: '#f0dfc1',
  },
  midnight: {
    bg: '#1a1d2b',
    surface: '#252938',
    ink: '#f0eee5',
    muted: '#a6a4b3',
    subtle: '#6c6a7a',
    line: '#363a4a',
    accent: '#d4b282',
    accentDark: '#bb9963',
    warm: '#363a4a',
  },
};

export const THEME_LABELS: Record<ThemeId, string> = {
  cream: 'Cream',
  garden: 'Garden',
  forest: 'Forest',
  dusk: 'Dusk',
  ocean: 'Ocean',
  earth: 'Earth',
  midnight: 'Midnight',
};

export const THEME_DESCRIPTIONS: Record<ThemeId, string> = {
  cream: 'The default — warm and quiet.',
  garden: 'Soft rose, like a remembered bouquet.',
  forest: 'Deep green, calm as a long walk.',
  dusk: 'Indigo and purple, the hour before dark.',
  ocean: 'Gentle blue, like a long shore.',
  earth: 'Honeyed browns, grounded and warm.',
  midnight: 'Deep night, when memories rise.',
};

export const ALL_THEMES: ThemeId[] = [
  'cream', 'garden', 'forest', 'dusk', 'ocean', 'earth', 'midnight',
];

export function getTheme(id: string | null | undefined): Theme {
  if (id && id in THEMES) return THEMES[id as ThemeId];
  return THEMES.cream;
}

// Build a CSS string of variables for inline application on the body
export function themeToCssVars(themeId: string | null | undefined): string {
  const t = getTheme(themeId);
  return [
    `--bg: ${t.bg}`,
    `--surface: ${t.surface}`,
    `--ink: ${t.ink}`,
    `--muted: ${t.muted}`,
    `--subtle: ${t.subtle}`,
    `--line: ${t.line}`,
    `--accent: ${t.accent}`,
    `--accent-dark: ${t.accentDark}`,
    `--warm: ${t.warm}`,
  ].join('; ');
}

// Build a React inline style object
export function themeToStyle(themeId: string | null | undefined): CSSProperties {
  const t = getTheme(themeId);
  return {
    ['--bg' as string]: t.bg,
    ['--surface' as string]: t.surface,
    ['--ink' as string]: t.ink,
    ['--muted' as string]: t.muted,
    ['--subtle' as string]: t.subtle,
    ['--line' as string]: t.line,
    ['--accent' as string]: t.accent,
    ['--accent-dark' as string]: t.accentDark,
    ['--warm' as string]: t.warm,
    backgroundColor: t.bg,
    color: t.ink,
  } as CSSProperties;
}
