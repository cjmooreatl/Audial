// Global audio state — Zustand store. Only one source can play at a time.
//
// Sources:
//   wire    — The Wire's autoplay loop. Calls getNextRadioTrack on `ended`.
//   channel — A channel's featured set auto-playing. Cycles within the set.
//   preview — One-shot preview from search results / set detail. Resumes the
//             previous source after end.

import { create } from 'zustand';
import api, { type RadioTrack, type TrackSnapshot } from '../api';

export type AudioSource = 'wire' | 'channel' | 'preview' | null;

export interface NowPlayingTrack extends TrackSnapshot {
  setId?: string;
  setTitle?: string;
  ownerHandle?: string;
  ownerDisplayName?: string;
  ownerAccentColor?: string;
}

interface AudioState {
  current: NowPlayingTrack | null;
  source: AudioSource;
  isPlaying: boolean;
  hasInteracted: boolean; // first-tap autoplay gate
  recentTrackIds: number[]; // last ~10 played, for The Wire's no-repeat
  // Channel-source state
  channelQueue: TrackSnapshot[];
  channelIndex: number;
  channelMeta: { setId: string; setTitle: string; ownerHandle: string; ownerAccentColor: string } | null;
  // Preview source resumption
  resumeSource: { source: AudioSource; track: NowPlayingTrack | null } | null;

  // Actions
  markInteracted: () => void;
  playWire: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  next: () => Promise<void>;
  playChannel: (
    tracks: TrackSnapshot[],
    meta: { setId: string; setTitle: string; ownerHandle: string; ownerAccentColor: string },
    startIndex?: number,
  ) => void;
  playPreview: (track: NowPlayingTrack) => void;
  onEnded: () => Promise<void>;
  pushRecent: (id: number) => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  current: null,
  source: null,
  isPlaying: false,
  hasInteracted: false,
  recentTrackIds: [],
  channelQueue: [],
  channelIndex: 0,
  channelMeta: null,
  resumeSource: null,

  markInteracted: () => set({ hasInteracted: true }),

  pushRecent: (id: number) => {
    const recent = get().recentTrackIds;
    const next = [id, ...recent.filter((x) => x !== id)].slice(0, 10);
    set({ recentTrackIds: next });
  },

  playWire: async () => {
    const { recentTrackIds } = get();
    try {
      const { track } = await api.getNextRadioTrack({ recentTrackIds });
      if (!track) return;
      set({
        current: track,
        source: 'wire',
        isPlaying: true,
      });
      get().pushRecent(track.itunesTrackId);
    } catch (err) {
      console.error('playWire failed', err);
    }
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    if (get().current) set({ isPlaying: true });
  },
  toggle: () => {
    const { isPlaying, current } = get();
    if (!current) return;
    set({ isPlaying: !isPlaying });
  },

  next: async () => {
    const src = get().source;
    if (src === 'wire') {
      await get().playWire();
    } else if (src === 'channel') {
      const { channelQueue, channelIndex, channelMeta } = get();
      if (!channelQueue.length || !channelMeta) return;
      const nextIdx = (channelIndex + 1) % channelQueue.length;
      const t = channelQueue[nextIdx];
      set({
        current: {
          ...t,
          setId: channelMeta.setId,
          setTitle: channelMeta.setTitle,
          ownerHandle: channelMeta.ownerHandle,
          ownerAccentColor: channelMeta.ownerAccentColor,
        },
        channelIndex: nextIdx,
        isPlaying: true,
      });
      get().pushRecent(t.itunesTrackId);
    }
  },

  playChannel: (tracks, meta, startIndex = 0) => {
    const playable = tracks.filter((t) => t.previewUrl);
    if (!playable.length) return;
    const t = playable[startIndex] ?? playable[0];
    set({
      channelQueue: playable,
      channelIndex: playable.indexOf(t),
      channelMeta: meta,
      current: {
        ...t,
        setId: meta.setId,
        setTitle: meta.setTitle,
        ownerHandle: meta.ownerHandle,
        ownerAccentColor: meta.ownerAccentColor,
      },
      source: 'channel',
      isPlaying: true,
      resumeSource: null,
    });
    get().pushRecent(t.itunesTrackId);
  },

  playPreview: (track) => {
    const prev = get();
    set({
      resumeSource: { source: prev.source, track: prev.current },
      current: track,
      source: 'preview',
      isPlaying: true,
    });
    get().pushRecent(track.itunesTrackId);
  },

  onEnded: async () => {
    const { source, resumeSource } = get();
    if (source === 'preview' && resumeSource) {
      // Restore prior source. If wire, fetch a new track; if channel, advance.
      if (resumeSource.source === 'wire') {
        set({ resumeSource: null });
        await get().playWire();
      } else if (resumeSource.source === 'channel') {
        set({ resumeSource: null });
        await get().next();
      } else {
        set({
          current: null,
          source: null,
          isPlaying: false,
          resumeSource: null,
        });
      }
      return;
    }
    await get().next();
  },
}));
