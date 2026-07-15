// @ts-nocheck
// Scheduled job (see schedule.sql in this folder) that re-resolves any
// Deezer-sourced or missing previewUrl across every set. Needed on a
// recurring basis, not just once: Deezer's preview links are signed CDN
// URLs with a ~24h expiry (confirmed by decoding the `exp=` timestamp on a
// stored URL), so anything resolved through the Deezer fallback goes
// silently dead about a day after being saved. iTunes-sourced previews are
// plain static URLs with no expiry, so tracks that already have one are
// left alone — only Deezer links and still-missing tracks get re-checked,
// keeping the daily workload (and iTunes API usage) small.
//
// Runs with the service role key (bypasses RLS) since it touches every
// user's sets, not just one caller's.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const STOREFRONTS = ['US', 'GB', 'JP', 'DE', 'BR'];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function coreTitle(s: string): string {
  return normalize(
    s
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[-–—].*$/, '')
      .replace(/\b(feat\.?|ft\.?|featuring)\b.*$/i, ''),
  );
}

function isCloseMatch(candidateTitle: string, candidateArtist: string, title: string, artist: string): boolean {
  if (coreTitle(candidateTitle) !== coreTitle(title)) return false;
  const cArtist = normalize(candidateArtist);
  const tArtist = normalize(artist);
  return cArtist === tArtist || cArtist.includes(tArtist) || tArtist.includes(cArtist);
}

async function searchItunesStorefront(term: string, country: string) {
  const qs = new URLSearchParams({ term, media: 'music', entity: 'song', limit: '5', country });
  const res = await fetch(`https://itunes.apple.com/search?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

async function resolveViaItunes(title: string, artist: string): Promise<string | null> {
  const term = `${title} ${artist}`.trim();
  const results = await Promise.allSettled(STOREFRONTS.map((c) => searchItunesStorefront(term, c)));
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const match = r.value.find(
      (t: any) => t.previewUrl && isCloseMatch(t.trackName ?? '', t.artistName ?? '', title, artist),
    );
    if (match) return match.previewUrl;
  }
  return null;
}

async function resolveViaDeezer(title: string, artist: string): Promise<string | null> {
  try {
    const qs = new URLSearchParams({ q: `${title} ${artist}`, limit: '5' });
    const res = await fetch(`https://api.deezer.com/search?${qs}`);
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.data ?? []).find(
      (t: any) => t?.preview && isCloseMatch(t.title ?? '', t.artist?.name ?? '', title, artist),
    );
    return match?.preview ?? null;
  } catch {
    return null;
  }
}

function isDeezerUrl(url: string | null | undefined): boolean {
  return !!url && url.includes('dzcdn.net');
}

// Runs `items` through `fn`, at most `size` concurrently at a time — running
// an entire set's tracks in one Promise.all (up to ~70 at once, each firing
// 5 parallel iTunes storefront requests) reliably triggered rate limiting,
// which surfaced as failed re-resolutions.
async function mapWithConcurrency<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

serve(async (_req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing service role configuration.' }), { status: 500 });
    }

    const setsRes = await fetch(`${SUPABASE_URL}/rest/v1/sets?select=id,tracks`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    if (!setsRes.ok) throw new Error(`Failed to fetch sets: HTTP ${setsRes.status}`);
    const sets = await setsRes.json();

    let tracksChecked = 0;
    let tracksChanged = 0;
    let tracksFailedRefresh = 0;

    for (const set of sets) {
      const tracks = set.tracks ?? [];
      let changed = false;

      const updated = await mapWithConcurrency(tracks, 8, async (t: any) => {
        const needsRefresh = isDeezerUrl(t.previewUrl) || !t.previewUrl;
        if (!needsRefresh || !t.title || !t.artist) return t;

        tracksChecked++;
        const fromItunes = await resolveViaItunes(t.title, t.artist);
        const newUrl = fromItunes ?? (await resolveViaDeezer(t.title, t.artist));

        // Only ever overwrite when a fresh match is actually found. A failed
        // lookup this cycle (rate limiting, a transient error, etc.) must
        // never downgrade an existing previewUrl to null — that's real data
        // loss for what may well just be a temporary hiccup; the next
        // scheduled run gets another chance instead.
        if (!newUrl) {
          if (t.previewUrl) tracksFailedRefresh++;
          return t;
        }
        if (newUrl !== (t.previewUrl ?? null)) {
          changed = true;
          tracksChanged++;
          return { ...t, previewUrl: newUrl };
        }
        return t;
      });

      if (changed) {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/sets?id=eq.${set.id}`, {
          method: 'PATCH',
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ tracks: updated }),
        });
        if (!patchRes.ok) {
          console.error(`Failed to update set ${set.id}: HTTP ${patchRes.status}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ setsProcessed: sets.length, tracksChecked, tracksChanged, tracksFailedRefresh }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error.';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
