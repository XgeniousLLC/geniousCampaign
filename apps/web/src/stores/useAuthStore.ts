import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@genius-campaign/shared';

export type { Role } from '@genius-campaign/shared';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'gc-auth' },
  ),
);
