# Design tokens

Extracted from `geniusCampaign.dc.html`'s inline styles. Dark theme, dense/functional B2B admin aesthetic — 13px base font size (smaller than Tailwind's default), Geist for UI text, Geist Mono for numeric/tabular values (counts, keyboard shortcuts, quota numbers).

Use these as the actual Tailwind config for `apps/web` (GC-006) rather than hand-picking colors per component — every color in the design maps to one of these.

## Tailwind config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      fontSize: {
        base: ['13px', '1.5'], // this app's base is 13px, not Tailwind's default 16px
      },
      colors: {
        // Backgrounds, darkest to lightest
        base: '#0B0C0F',        // app background
        sidebar: '#0D0E12',     // sidebar background
        surface: '#0E1013',     // modal footers, secondary panels
        panel: '#111318',       // cards / panels
        panel2: '#121419',      // modals, notification dropdown
        field: '#131519',       // input/search field background
        raised: '#15171C',      // hover rows, textarea bg
        raised2: '#16181E',     // hover state, divider-adjacent bg

        // Borders
        'border-subtle': '#1A1D23',
        'border-default': '#1E2128',
        'border-strong': '#23262E',
        'border-emphasis': '#262A33',
        'border-modal': '#2C303A',

        // Text, brightest to most muted
        'text-heading': '#F1F2F5',
        'text-primary': '#E7E9EE',
        'text-secondary': '#D8DBE1',
        'text-tertiary': '#C3C8D1',
        'text-quaternary': '#9AA1AD',
        'text-muted': '#7B8290',
        'text-faint': '#6B7280',
        'text-meta': '#5B6270',
        'text-label': '#4C525E', // uppercase section labels in sidebar

        // Accent (indigo) — primary actions, links, active nav state
        accent: '#6366F1',
        'accent-hover': '#5457EC',
        'accent-gradient-end': '#4F46E5',
        'accent-light': '#818CF8',   // links, icons on dark bg
        'accent-lighter': '#A5B4FC', // link hover
        'accent-tint': '#C7CBFF',    // lightest accent, rare use

        // Status colors
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#60A5FA',
        'info-alt': '#3B82F6', // used in avatar gradients

        // Brand icons (not general UI colors — only for provider icons/badges)
        'brand-google': '#EA4335',
        'brand-aws': '#FF9900',
        'brand-ai': '#A855F7', // AI Assist feature accent (paired with accent in a gradient)
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '7px',
        md: '8px',
        lg: '9px',
        xl: '10px',
        '2xl': '13px',
        '3xl': '14px',
      },
    },
  },
} satisfies Config;
```

## Usage notes

- **Status color meaning is consistent app-wide** (matches the invariant already in `CLAUDE.md`): `success` = healthy/active, `warning` = near-limit/needs attention, `danger` = error/blocked, `info` = neutral informational. Use these exact four for every status badge, quota bar, and health indicator — don't introduce a fifth status color.
- **Quota bars** (Sender Accounts screen) shift from `success` → `warning` → `danger` as usage climbs — this matches the thresholds already decided for GC-047 (green under ~70%, amber 70–90%, red over 90%).
- **The health pill in the header** (top bar, next to notifications) reflects overall sending health — ties to GC-050's bounce-rate circuit breaker. When that ticket lands, this pill's color/label should reflect the breaker's state.
- Load the font via Google Fonts exactly as the design does: `Geist:wght@400;500;600;700` and `Geist+Mono:wght@400;500;600`.
- Buttons, inputs, and cards in the design consistently use `border-radius` in the 7–14px range depending on element size (smaller elements get smaller radii) — the scale above captures the full range used.
