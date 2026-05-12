// Seed track lookup helper. Calls iTunes Search at scenario seed time to pull
// real track metadata + previewable URLs. Caches results during a single run
// so we don't re-query the same artist+title.

import type { TrackSnapshot } from '../../src/tables/sets';

interface ITunesTrackResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackTimeMillis: number;
}

const cache = new Map<string, TrackSnapshot[]>();

function highRes(url: string): string {
  return url.replace(/\/\d+x\d+bb\.(jpg|png)/, '/600x600bb.$1');
}

export async function searchSeed(query: string, limit = 5): Promise<TrackSnapshot[]> {
  const key = `${query}|${limit}`;
  if (cache.has(key)) return cache.get(key)!;
  const qs = new URLSearchParams({ term: query, media: 'music', entity: 'song', limit: String(limit) });
  const res = await fetch(`https://itunes.apple.com/search?${qs.toString()}`);
  if (!res.ok) {
    cache.set(key, []);
    return [];
  }
  const data = (await res.json()) as { results: ITunesTrackResult[] };
  const now = Date.now();
  const tracks = data.results
    .filter((r) => r.trackId && r.trackName && r.previewUrl)
    .map((r) => ({
      itunesTrackId: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      albumName: r.collectionName ?? '',
      coverUrl: highRes(r.artworkUrl100),
      previewUrl: r.previewUrl ?? null,
      durationMs: r.trackTimeMillis ?? 0,
      addedAt: now,
    }));
  cache.set(key, tracks);
  return tracks;
}

// Curated query pool — diverse genres, all reliable iTunes hits.
const QUERY_POOL = [
  'fka twigs cellophane',
  'arca riquiqui',
  'four tet baby',
  'caribou home',
  'aphex twin xtal',
  'burial archangel',
  'mount kimbie made to stray',
  'jamie xx gosh',
  'bicep glue',
  'jon hopkins luminous beings',
  'objekt theme from q',
  'jay electronica exhibit c',
  'kelela frontline',
  'sevdaliza human',
  'dean blunt the rot',
  'flying lotus never catch me',
  'nicolas jaar mi mujer',
  'oneohtrix point never the pure and the damned',
  'tirzah devotion',
  'james blake limit to your love',
  'thom yorke not the news',
  'yves tumor jackie',
  'arctic monkeys do i wanna know',
  'fiona apple shameika',
  'frank ocean nights',
  'big thief not',
  'phoebe bridgers motion sickness',
  'mitski nobody',
  'beach house space song',
  'tame impala the less i know the better',
  'angel olsen shut up kiss me',
  'yves tumor gospel for a new century',
  'gil scott-heron new york is killing me',
  'd angelo really love',
  'erykah badu didnt cha know',
  'solange cranes in the sky',
  'pinegrove old friends',
  'japanese breakfast be sweet',
  'sufjan stevens should have known better',
  'destroyer kaputt',
];

// Fetch a balanced pool of seed tracks. Returns 30-40 unique tracks.
export async function buildSeedTrackPool(): Promise<TrackSnapshot[]> {
  const all: TrackSnapshot[] = [];
  // Run queries in parallel batches of 8 — iTunes is fine with parallel calls.
  const batchSize = 8;
  for (let i = 0; i < QUERY_POOL.length; i += batchSize) {
    const batch = QUERY_POOL.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((q) => searchSeed(q, 1)));
    for (const r of results) {
      if (r[0]) all.push(r[0]);
    }
  }
  // Dedupe by track ID.
  const seen = new Set<number>();
  return all.filter((t) => {
    if (seen.has(t.itunesTrackId)) return false;
    seen.add(t.itunesTrackId);
    return true;
  });
}

// Pick N tracks from a pool with rotation — used to give each set a coherent,
// non-overlapping slice.
export function carve(pool: TrackSnapshot[], offset: number, count: number): TrackSnapshot[] {
  const result: TrackSnapshot[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[(offset + i) % pool.length]);
  }
  return result;
}
