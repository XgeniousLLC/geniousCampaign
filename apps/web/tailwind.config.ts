import type { Config } from 'tailwindcss';

// All app colors resolve through CSS variables (defined in src/index.css for
// `:root` = dark and `:root[data-theme="light"]` = light), so every
// `bg-panel` / `text-text-muted` / `border-border-default` utility below
// adapts to the active theme with zero per-component branching. Only
// intentional one-off colors (modal scrims, email-client previews, button
// text) stay hardcoded at their call sites.
const v = (name: string) => `rgb(var(--gc-${name}) / <alpha-value>)`;

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
        // Backgrounds, darkest to lightest (dark) / lightest structure (light)
        base: v('base'), // app background
        sidebar: v('sidebar'), // sidebar background
        surface: v('surface'), // modal footers, secondary panels
        panel: v('panel'), // cards / panels
        panel2: v('panel2'), // modals, notification dropdown
        field: v('field'), // input/search field background
        raised: v('raised'), // hover rows, textarea bg
        raised2: v('raised2'), // hover state, divider-adjacent bg

        // Borders
        'border-subtle': v('border-subtle'),
        'border-default': v('border-default'),
        'border-strong': v('border-strong'),
        'border-emphasis': v('border-emphasis'),
        'border-modal': v('border-modal'),

        // Text, brightest to most muted
        'text-heading': v('text-heading'),
        'text-primary': v('text-primary'),
        'text-secondary': v('text-secondary'),
        'text-tertiary': v('text-tertiary'),
        'text-quaternary': v('text-quaternary'),
        'text-muted': v('text-muted'),
        'text-faint': v('text-faint'),
        'text-meta': v('text-meta'),
        'text-label': v('text-label'), // uppercase section labels in sidebar

        // Accent (indigo) — primary actions, links, active nav state
        accent: v('accent'),
        'accent-hover': v('accent-hover'),
        'accent-gradient-end': v('accent-gradient-end'),
        'accent-light': v('accent-light'), // links, icons (theme-adjusted)
        'accent-lighter': v('accent-lighter'), // link hover (theme-adjusted)
        'accent-tint': v('accent-tint'), // lightest accent, rare use

        // Status colors (theme-adjusted for contrast on each background)
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),
        'info-alt': v('info-alt'), // used in avatar gradients

        // Brand icons (not general UI colors — only for provider icons/badges)
        'brand-google': v('brand-google'),
        'brand-aws': v('brand-aws'),
        'brand-ai': v('brand-ai'), // AI Assist feature accent (paired with accent in a gradient)
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
