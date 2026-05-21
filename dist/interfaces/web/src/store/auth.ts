// Auth state wrapper around the SDK's auth module + getCurrentChannel.
// Keeps a Zustand store of the current channel for synchronous reads in render.

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
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
      const { 
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({
          isReady: true,
          isAuthenticated: false,
          channel: null,
        });
        return;
      }

      const channel: CurrentChannel = {
        id: user.id,
        email: user.email || '',
        handle: null,
        displayName: null,
        notes: null,
        accentColor: '#000000',
        featuredSetId: null,
        coSigns: [],
        avatarUrl: null,
        onboardingComplete: false,
        counts: { sets: 0, tunedIn: 0, tunedTo: 0 },
      };

      set({
        isReady: true,
        isAuthenticated: true,
        channel,
      });

    } catch (err) {
      console.error('auth refresh failed', err);
      set({ isReady: true, isAuthenticated: false, channel: null });
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('logout failed', err);
    }
    set({ isAuthenticated: false, channel: null });
  },
}));

// Initial bootstrap: refresh on import so any component that mounts can read
// the store synchronously after the first await.
export function bootstrapAuth() {
  supabase.auth.onAuthStateChange(() => {
    useAuth.getState().refresh();
  });
}
