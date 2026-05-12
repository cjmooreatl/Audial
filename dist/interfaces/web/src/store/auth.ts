// Auth state wrapper around the SDK's auth module + getCurrentChannel.
// Keeps a Zustand store of the current channel for synchronous reads in render.

import { create } from 'zustand';
import { auth } from '@mindstudio-ai/interface';
import api, { type CurrentChannel } from '../api';

interface AuthState {
  isReady: boolean;
  isAuthenticated: boolean;
  channel: CurrentChannel | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isReady: false,
  isAuthenticated: false,
  channel: null,
  refresh: async () => {
    try {
      const { channel } = await api.getCurrentChannel();
      set({
        isReady: true,
        isAuthenticated: !!channel,
        channel,
      });
    } catch (err) {
      console.error('auth refresh failed', err);
      set({ isReady: true, isAuthenticated: false, channel: null });
    }
  },
  signOut: async () => {
    try {
      await auth.logout();
    } catch (err) {
      console.error('logout failed', err);
    }
    set({ isAuthenticated: false, channel: null });
  },
}));

// Initial bootstrap: refresh on import so any component that mounts can read
// the store synchronously after the first await.
export function bootstrapAuth() {
  auth.onAuthStateChanged(() => {
    useAuth.getState().refresh();
  });
}
