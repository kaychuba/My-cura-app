import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthUser } from '@my-cura/shared-types';
import { apiClient } from '../services/api.client';

// The refresh token deliberately never appears in this store (or anywhere
// JavaScript can reach): the API keeps it in an HttpOnly SameSite=Strict
// cookie scoped to /api/v1/auth, so XSS cannot exfiltrate the session.

interface LoginOutcome {
  requires2FA?: boolean;
  partialToken?: string;
  /** Staff account that must enroll in MFA before using the app. */
  mfaSetupRequired?: boolean;
}

interface TokenResponse {
  accessToken?: string;
  user?: AuthUser;
  requires2FA?: boolean;
  partialToken?: string;
  mfaSetupRequired?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<LoginOutcome>;
  verify2FA: (partialToken: string, code: string) => Promise<void>;
  adoptSession: (accessToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post<TokenResponse>('/auth/login', {
            email,
            password,
          });

          if (data.requires2FA) {
            return { requires2FA: true, partialToken: data.partialToken };
          }

          set({
            accessToken: data.accessToken!,
            user: data.user!,
            isAuthenticated: true,
          });

          return data.mfaSetupRequired ? { mfaSetupRequired: true } : {};
        } finally {
          set({ isLoading: false });
        }
      },

      verify2FA: async (partialToken, code) => {
        const { data } = await apiClient.post<TokenResponse>('/auth/2fa/verify', {
          partialToken,
          code,
        });
        set({ accessToken: data.accessToken!, user: data.user!, isAuthenticated: true });
      },

      adoptSession: (accessToken, user) => {
        set({ accessToken, user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          // Refresh token travels via the auth cookie; body stays empty.
          await apiClient.post('/auth/logout', {});
        } catch {
          // Session may already be dead server-side — clear locally regardless.
        } finally {
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      refreshAccessToken: async () => {
        try {
          const { data } = await apiClient.post<TokenResponse>('/auth/refresh', {});
          set({ accessToken: data.accessToken!, user: data.user! });
          return true;
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false });
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
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
