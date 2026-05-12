import { db } from '@mindstudio-ai/agent';

export interface TrackSnapshot {
  itunesTrackId: number;
  title: string;
  artist: string;
  albumName: string;
  coverUrl: string;
  previewUrl: string | null;
  durationMs: number;
  addedAt: number;
}

export interface Set {
  ownerId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  tracks: TrackSnapshot[];
  trackCount: number;
  totalDurationMs: number;
  spotifyImportUrl: string | null;
}

export const Sets = db.defineTable<Set>('sets', {
  defaults: {
    description: null,
    coverUrl: null,
    tracks: [],
    trackCount: 0,
    totalDurationMs: 0,
    spotifyImportUrl: null,
  },
});
