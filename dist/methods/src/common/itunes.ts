// iTunes Search API helpers — public, no auth required.
// https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

import type { TrackSnapshot } from '../tables/sets';

interface ITunesTrackResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackTimeMillis: number;
  artistId?: number;
}

interface ITunesArtistResult {
  artistId: number;
  artistName: string;
  primaryGenreName?: string;
}

interface ITunesArtist {
  itunesArtistId: number;
  name: string;
  imageUrl: string;
}

// Convert iTunes' tiny 100x100 thumbnail URL to a high-resolution variant.
function highResArtwork(url: string, size = 600): string {
  return url.replace(/\/\d+x\d+bb\.(jpg|png)/, `/${size}x${size}bb.$1`);
}

async function itunesGet<T>(params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`https://itunes.apple.com/search?${qs}`, {
    headers: { 'User-Agent': 'Audial/1.0' },
  });
  if (!res.ok) throw new Error(`iTunes Search returned ${res.status}`);
  return (await res.json()) as T;
}

// Storefronts to query in parallel. The US store has the deepest catalog, but
// licensing gaps mean many tracks (UK indie, J-pop, K-pop, Latin, anime, etc.)
// only exist in regional stores. Querying a handful of representative regions
// in parallel widens coverage dramatically with one extra round of fetches.
const STOREFRONTS = ['US', 'GB', 'JP', 'DE', 'BR'];

// Single-storefront raw fetch. Kept private — callers go through searchTracks
// which fans out across storefronts and dedupes.
async function searchTracksInStorefront(
  term: string,
  country: string,
  limit: number,
): Promise<ITunesTrackResult[]> {
  const data = await itunesGet<{ resultCount: number; results: ITunesTrackResult[] }>({
    term,
    media: 'music',
    entity: 'song',
    limit,
    country,
  });
  return data.results;
}

// Build a stable dedupe key from track metadata. Lowercased + whitespace
// normalized so "Tame Impala — Let It Happen" and "tame impala  let it happen"
// collapse to one entry.
function dedupeKey(title: string, artist: string): string {
  return `${title}\u0000${artist}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Search for tracks across multiple iTunes storefronts in parallel. Results are
// merged, deduped by title+artist, and filtered to only streamable tracks
// (those with a non-null previewUrl) so the UI never surfaces a search hit the
// user can't actually play.
export async function searchTracks(
  term: string,
  limit = 20,
): Promise<TrackSnapshot[]> {
  if (!term.trim()) return [];

  // Over-fetch from each storefront so we have plenty to choose from after the
  // streamable filter and dedupe. Most non-US storefronts still return
  // overlapping results, so the merged set won't actually be 5x larger.
  const perStorefront = Math.max(limit * 2, 25);
  const settled = await Promise.allSettled(
    STOREFRONTS.map((country) =>
      searchTracksInStorefront(term, country, perStorefront),
    ),
  );

  // Track best result per dedupe key. Prefer the entry that has a previewUrl —
  // a US miss often has a populated GB/JP variant.
  const byKey = new Map<string, ITunesTrackResult>();
  for (const settledResult of settled) {
    if (settledResult.status !== 'fulfilled') continue;
    for (const r of settledResult.value) {
      if (!r.trackId || !r.trackName || !r.artistName) continue;
      const key = dedupeKey(r.trackName, r.artistName);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, r);
      } else if (!existing.previewUrl && r.previewUrl) {
        // Upgrade — replace a non-streamable hit with a streamable one.
        byKey.set(key, r);
      }
    }
  }

  const now = Date.now();
  return Array.from(byKey.values())
    // Streamable-only — user explicitly asked that any returned result must play.
    .filter((r) => !!r.previewUrl)
    .slice(0, limit)
    .map((r) => ({
      itunesTrackId: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      albumName: r.collectionName ?? '',
      coverUrl: highResArtwork(r.artworkUrl100),
      previewUrl: r.previewUrl ?? null,
      durationMs: r.trackTimeMillis ?? 0,
      addedAt: now,
    }));
}

// Look up a single track by title + artist — used by the Spotify import flow
// to find iTunes preview URLs for tracks the Spotify API returned.
export async function lookupTrackByQuery(
  title: string,
  artist: string,
): Promise<TrackSnapshot | null> {
  const term = `${title} ${artist}`.trim();
  const results = await searchTracks(term, 5);
  if (!results.length) return null;
  // Prefer first result with a preview, otherwise return first result.
  return results.find((r) => r.previewUrl) ?? results[0];
}

// Search artists. iTunes' artist search lacks images, so we follow up with a
// song lookup for each result to grab artwork from their most popular track.
export async function searchArtists(term: string, limit = 8): Promise<ITunesArtist[]> {
  if (!term.trim()) return [];
  const data = await itunesGet<{ resultCount: number; results: ITunesArtistResult[] }>({
    term,
    media: 'music',
    entity: 'musicArtist',
    limit,
  });
  // For each artist, find a representative cover from one of their tracks for
  // use as an avatar image. Run lookups in parallel.
  const enriched = await Promise.all(
    data.results
      .filter((a) => a.artistId && a.artistName)
      .map(async (a) => {
        const tracks = await searchTracks(a.artistName, 1);
        const imageUrl = tracks[0]?.coverUrl ?? '';
        return {
          itunesArtistId: a.artistId,
          name: a.artistName,
          imageUrl,
        };
      }),
  );
  return enriched.filter((a) => a.imageUrl); // drop artists where we couldn't find a cover
}
