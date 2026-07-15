// Broad-catalog track search. iTunes' Search API (lib/itunes.ts) is fast and
// gives a stable ID + preview URL directly, but its catalog has gaps —
// regional exclusives, niche/indie releases, newer singles. To close those
// gaps without per-user Spotify OAuth (blocked by Developer Mode's quota cap
// until we qualify for Extended Quota — see src/roadmap/spotify-connect.md),
// we widen the search using Spotify's catalog via Client Credentials
// (app-only auth, no per-user login, no quota impact) for metadata only,
// then resolve a playable preview through iTunes' title+artist lookup and,
// failing that, Deezer.

import { supabase } from './supabase';
import { searchTracks as iTunesSearchTracks, getPreviewUrl, type TrackSnapshot } from './itunes';

interface SpotifyCatalogTrack {
  spotifyId: string;
  title: string;
  artist: string;
  albumName: string;
  coverUrl: string | null;
  durationMs: number;
}

function normKey(title: string, artist: string): string {
  return `${title} ${artist}`.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// FNV-1a 32-bit hash — stable integer ID for tracks with no iTunes match.
function hashString(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

async function searchSpotifyCatalog(query: string, limit: number): Promise<SpotifyCatalogTrack[]> {
  const { data, error } = await supabase.functions.invoke('spotify-import', {
    body: { query, limit },
  });
  if (error || data?.error) return [];
  return (data?.tracks ?? []) as SpotifyCatalogTrack[];
}

interface DeezerTrack {
  previewUrl: string;
  durationMs: number;
  coverUrl: string | null;
}

// Exported for AudioController — Deezer's preview links are signed and
// expire 15 minutes after being issued, so any previously-stored Deezer url
// must be re-resolved fresh immediately before playback, never trusted as-is.
export async function resolveDeezerTrack(title: string, artist: string): Promise<DeezerTrack | null> {
  const { data, error } = await supabase.functions.invoke('deezer-search', {
    body: { title, artist },
  });
  if (error || !data?.previewUrl) return null;
  return {
    previewUrl: data.previewUrl as string,
    durationMs: (data.durationMs as number) ?? 0,
    coverUrl: (data.coverUrl as string | null) ?? null,
  };
}

// iTunes lookup first (cheap, no CORS proxy needed), then Deezer.
async function resolvePreview(title: string, artist: string): Promise<string | null> {
  const fromItunes = await getPreviewUrl(title, artist).catch(() => null);
  if (fromItunes) return fromItunes;
  const deezer = await resolveDeezerTrack(title, artist).catch(() => null);
  return deezer?.previewUrl ?? null;
}

export async function searchCatalog(query: string, limit = 8): Promise<TrackSnapshot[]> {
  if (!query.trim()) return [];

  const [itunesResults, spotifyResults] = await Promise.all([
    iTunesSearchTracks(query, limit),
    // Spotify's Client Credentials app runs under Developer Mode, which hard
    // caps the search `limit` param at 10 — anything above that returns a
    // plain HTTP 400 ("Invalid limit") from Spotify itself. That failure was
    // getting silently swallowed by the .catch() below, so callers asking
    // for more than 10 total results (e.g. the set modals' limit of 12)
    // always got zero Spotify results with no visible error.
    searchSpotifyCatalog(query, Math.min(limit, 10)).catch(() => [] as SpotifyCatalogTrack[]),
  ]);

  const seen = new Set(itunesResults.map((t) => normKey(t.title, t.artist)));
  const spotifyOnly = spotifyResults.filter((t) => !seen.has(normKey(t.title, t.artist)));

  // Interleave both sources by their own relevance ranking (alternating,
  // top-ranked first) instead of letting iTunes' result count decide whether
  // Spotify is considered at all — otherwise a track only Spotify surfaces
  // can get crowded out by a full page of iTunes hits that happened to fill
  // the quota first.
  type Slot =
    | { source: 'itunes'; track: TrackSnapshot }
    | { source: 'spotify'; track: SpotifyCatalogTrack };
  const slots: Slot[] = [];
  const maxLen = Math.max(itunesResults.length, spotifyOnly.length);
  for (let i = 0; i < maxLen && slots.length < limit; i++) {
    if (itunesResults[i]) slots.push({ source: 'itunes', track: itunesResults[i] });
    if (spotifyOnly[i] && slots.length < limit) slots.push({ source: 'spotify', track: spotifyOnly[i] });
  }

  const now = Date.now();
  return Promise.all(
    slots.map(async (slot) => {
      if (slot.source === 'itunes') return slot.track;
      const t = slot.track;
      return {
        itunesTrackId: hashString(t.spotifyId),
        title: t.title,
        artist: t.artist,
        albumName: t.albumName,
        coverUrl: t.coverUrl ?? '',
        previewUrl: await resolvePreview(t.title, t.artist),
        durationMs: t.durationMs,
        addedAt: now,
      } as TrackSnapshot;
    }),
  );
}
