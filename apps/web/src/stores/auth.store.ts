import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthUser } from '@my-cura/shared-types';
import { apiClient } from '../services/api.client';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{ requires2FA?: boolean; partialToken?: string }>;
  verify2FA: (partialToken: string, code: string) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<{
            requires2FA?: boolean;
            partialToken?: string;
            accessToken?: string;
            refreshToken?: string;
            user?: AuthUser;
          }>('/auth/login', { email, password });

          if (response.data.requires2FA) {
            return { requires2FA: true, partialToken: response.data.partialToken };
          }

          set({
            accessToken: response.data.accessToken!,
            refreshToken: response.data.refreshToken!,
            user: response.data.user!,
            isAuthenticated: true,
          });

          return {};
        } finally {
          set({ isLoading: false });
        }
      },

      verify2FA: async (partialToken, code) => {
        const response = await apiClient.post<{
          accessToken: string;
          refreshToken: string;
          user: AuthUser;
        }>('/auth/2fa/verify', { partialToken, code });

        set({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
          isAuthenticated: true,
        });
      },

      loginWithTokens: (accessToken, refreshToken, user) => {
        set({ accessToken, refreshToken, user, isAuthenticated: true });
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await apiClient.post('/auth/logout', { refreshToken });
          }
        } finally {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const response = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: AuthUser;
          }>('/auth/refresh', { refreshToken });

          set({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            user: response.data.user,
          });
          return true;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'mycura-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
