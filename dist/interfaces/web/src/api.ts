// Typed RPC client for Audial backend methods.
// Method names match the camelCase exports in dist/methods/src/*.ts.
// The createClient call uses export names, NOT kebab-case method IDs.

import { createClient } from '@mindstudio-ai/interface';

// TrackSnapshot mirror — must stay in sync with dist/methods/src/tables/sets.ts
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

export interface CoSign {
  itunesArtistId: number;
  name: string;
  imageUrl: string;
}

export interface ChannelSummary {
  id: string;
  handle: string;
  displayName: string;
  accentColor: string;
  avatarUrl: string | null;
}

export interface CurrentChannel {
  id: string;
  email: string;
  handle: string | null;
  displayName: string | null;
  notes: string | null;
  accentColor: string;
  featuredSetId: string | null;
  coSigns: CoSign[];
  avatarUrl: string | null;
  onboardingComplete: boolean;
  counts: { sets: number; tunedIn: number; tunedTo: number };
}

export interface FeedCard {
  setId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  totalDurationMs: number;
  createdAt: number;
  owner: ChannelSummary;
}

export interface ChannelSetSummary {
  setId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  totalDurationMs: number;
  createdAt: number;
}

export interface ChannelFull {
  id: string;
  handle: string;
  displayName: string;
  accentColor: string;
  avatarUrl: string | null;
  notes: string | null;
  coSigns: CoSign[];
  featuredSetId: string | null;
  counts: { sets: number; tunedIn: number; tunedTo: number };
}

export interface SetFull {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  tracks: TrackSnapshot[];
  trackCount: number;
  totalDurationMs: number;
  spotifyImportUrl: string | null;
  created_at: number;
  updated_at: number;
}

export interface RadioTrack extends TrackSnapshot {
  setId: string;
  setTitle: string;
  ownerHandle: string;
  ownerDisplayName: string;
  ownerAccentColor: string;
}

export type FeedTab = 'subscribed' | 'on-rotation' | 'heavy-rotation' | 'drift';

interface AudialAPI {
  getCurrentChannel(): Promise<{ channel: CurrentChannel | null }>;
  completeOnboarding(input: {
    handle: string;
    displayName: string;
    notes?: string;
    accentColor?: string;
  }): Promise<{ channel: { id: string; handle: string; displayName: string; notes: string | null; accentColor: string } }>;
  updateChannel(input: {
    displayName?: string;
    handle?: string;
    notes?: string | null;
    accentColor?: string;
    avatarUrl?: string | null;
    featuredSetId?: string | null;
    coSigns?: CoSign[];
  }): Promise<{ channel: any }>;
  compileSet(input: {
    title: string;
    description?: string;
    coverUrl?: string;
    tracks?: TrackSnapshot[];
  }): Promise<{ set: SetFull }>;
  importSpotifyPlaylist(input: { url: string }): Promise<{ set: SetFull }>;
  updateSet(input: {
    setId: string;
    title?: string;
    description?: string | null;
    coverUrl?: string | null;
    tracks?: TrackSnapshot[];
  }): Promise<{ set: SetFull }>;
  deleteSet(input: { setId: string }): Promise<{ deleted: boolean }>;
  getSet(input: { setId: string }): Promise<{
    set: SetFull;
    owner: ChannelSummary;
    viewerHasSubscribed: boolean;
    viewerIsOwner: boolean;
  }>;
  fileTrack(input: { setId: string; track: TrackSnapshot }): Promise<{ set: SetFull; alreadyFiled: boolean }>;
  getHomeFeed(input: { tab: FeedTab; limit?: number }): Promise<{
    tab: FeedTab;
    cards: FeedCard[];
    substituted: boolean;
  }>;
  getChannel(input: { handle: string }): Promise<{
    channel: ChannelFull;
    sets: ChannelSetSummary[];
    featuredSet: SetFull | null;
    viewerHasSubscribed: boolean;
    viewerIsOwner: boolean;
  }>;
  subscribe(input: { channelId: string }): Promise<{ subscribed: boolean }>;
  unsubscribe(input: { channelId: string }): Promise<{ unsubscribed: boolean }>;
  searchAudial(input: { query: string; limit?: number }): Promise<{
    query: string;
    sets: { setId: string; title: string; coverUrl: string | null; trackCount: number; owner: ChannelSummary }[];
    channels: { channel: ChannelSummary; notes: string | null; tunedIn: number }[];
    tracks: TrackSnapshot[];
  }>;
  searchITunesTracks(input: { query: string; limit?: number }): Promise<{ tracks: TrackSnapshot[] }>;
  searchITunesArtists(input: { query: string; limit?: number }): Promise<{
    artists: { itunesArtistId: number; name: string; imageUrl: string }[];
  }>;
  getNextRadioTrack(input: { recentTrackIds?: number[] }): Promise<{ track: RadioTrack | null }>;
  logSpin(input: { setId: string; trackItunesId?: number }): Promise<{ logged: boolean }>;
}

const api = createClient<AudialAPI>();
export default api;
