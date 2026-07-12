import { create } from 'zustand';
import { AuthUser } from '@my-cura/shared-types';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../services/api.client';

const REFRESH_TOKEN_KEY = 'mycura_refresh_token';
const ACCESS_TOKEN_KEY = 'mycura_access_token';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<{ requires2FA?: boolean; partialToken?: string }>;
  loginWithBiometric: () => Promise<void>;
  verify2FA: (partialToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  loadStoredTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  loadStoredTokens: async () => {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (accessToken && refreshToken) {
      // Validate the stored session FIRST — never present an authenticated
      // UI on the strength of a token the server may have revoked.
      const refreshed = await get().refreshAccessToken();
      if (refreshed) {
        set({ isAuthenticated: true });
      } else {
        await get().logout();
      }
    }
  },

  login: async (email, password) => {
    const { data } = await apiClient.post<{
      requires2FA?: boolean;
      partialToken?: string;
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    }>('/auth/login', { email, password });

    if (data.requires2FA) {
      return { requires2FA: true, partialToken: data.partialToken };
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken!);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken!);

    set({ accessToken: data.accessToken!, user: data.user!, isAuthenticated: true });
    return {};
  },

  loginWithBiometric: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No stored session');

    const { data } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/refresh', { refreshToken });

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    set({ accessToken: data.accessToken, user: data.user, isAuthenticated: true });
  },

  verify2FA: async (partialToken, code) => {
    const { data } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/2fa/verify', { partialToken, code });

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    set({ accessToken: data.accessToken, user: data.user, isAuthenticated: true });
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const { data } = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/refresh', { refreshToken });

      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
      set({ accessToken: data.accessToken, user: data.user });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch { /* ignore */ }
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
