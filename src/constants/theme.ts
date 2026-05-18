// ─── Colors ───────────────────────────────────────────────────────────────────
export const colors = {
  // Coral / primary
  coral:        '#E8714A',
  coralLight:   '#EFA080',
  coralDark:    '#BE4E26',

  // Cream / background
  cream:        '#FDFAF5',
  creamDark:    '#EDE5D8',

  // Charcoal / text
  charcoal:     '#221E1A',
  charcoalLight:'#605B57',

  // Gold
  gold:         '#F5C418',
  goldLight:    '#F8DC8A',

  // Sage
  sage:         '#639E6F',
  sageLight:    '#CCDECE',

  // Neutrals
  white:        '#FFFFFF',
  border:       '#E3D9CF',
  muted:        '#EDE8E0',
  mutedFg:      '#7A706A',
  secondary:    '#F2EDE4',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
// Note: load these via expo-font or @expo-google-fonts
export const fonts = {
  display: 'PlayfairDisplay',       // headings
  sans:    'Inter',                 // body
} as const;

export const fontSizes = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────
export const radius = {
  sm:  8,
  md:  10,
  lg:  12,
  xl:  16,
  '2xl': 20,
  full: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#221E1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#221E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#221E1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;