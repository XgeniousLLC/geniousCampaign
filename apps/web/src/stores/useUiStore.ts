import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'gc-theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // private mode — fall through to default
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const startingTheme = initialTheme();
// Apply before first paint (store module runs on import, before render).
if (typeof document !== 'undefined') applyTheme(startingTheme);

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: startingTheme,
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore write failures
    }
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore write failures
      }
      applyTheme(next);
      return { theme: next };
    }),
}));
