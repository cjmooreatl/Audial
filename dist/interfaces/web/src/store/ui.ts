// UI store: auth modal intent, compile/share modal visibility, etc.

import { create } from 'zustand';
import type { TrackSnapshot } from '../api';

type AuthIntent = (() => void) | null;

interface UIState {
  authOpen: boolean;
  authIntent: AuthIntent;
  compileOpen: boolean;
  compilePreloadTrack: TrackSnapshot | null;
  shareOpen: boolean;
  editChannelOpen: boolean;
  // Edit Set: holds the setId being edited, or null when closed.
  editSetId: string | null;

  openAuth: (intent?: AuthIntent) => void;
  closeAuth: () => void;
  openCompile: (preloadTrack?: TrackSnapshot) => void;
  closeCompile: () => void;
  openShare: () => void;
  closeShare: () => void;
  openEditChannel: () => void;
  closeEditChannel: () => void;
  openEditSet: (setId: string) => void;
  closeEditSet: () => void;
}

export const useUI = create<UIState>((set) => ({
  authOpen: false,
  authIntent: null,
  compileOpen: false,
  compilePreloadTrack: null,
  shareOpen: false,
  editChannelOpen: false,
  editSetId: null,

  openAuth: (intent) => set({ authOpen: true, authIntent: intent ?? null }),
  closeAuth: () => set({ authOpen: false, authIntent: null }),
  openCompile: (preloadTrack) => set({ compileOpen: true, compilePreloadTrack: preloadTrack ?? null }),
  closeCompile: () => set({ compileOpen: false, compilePreloadTrack: null }),
  openShare: () => set({ shareOpen: true }),
  closeShare: () => set({ shareOpen: false }),
  openEditChannel: () => set({ editChannelOpen: true }),
  closeEditChannel: () => set({ editChannelOpen: false }),
  openEditSet: (setId) => set({ editSetId: setId }),
  closeEditSet: () => set({ editSetId: null }),
}));
