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
        base: '#0B0C0F', // app background
        sidebar: '#0D0E12', // sidebar background
        surface: '#0E1013', // modal footers, secondary panels
        panel: '#111318', // cards / panels
        panel2: '#121419', // modals, notification dropdown
        field: '#131519', // input/search field background
        raised: '#15171C', // hover rows, textarea bg
        raised2: '#16181E', // hover state, divider-adjacent bg

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
        'accent-light': '#818CF8', // links, icons on dark bg
        'accent-lighter': '#A5B4FC', // link hover
        'accent-tint': '#C7CBFF', // lightest accent, rare use

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
