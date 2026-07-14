// @ts-nocheck
// Deezer preview-URL resolver — public search API, no auth, no quota.
// Deezer's catalog covers many tracks iTunes' Search API misses; this is the
// last fallback in the preview-resolution chain (iTunes lookup first, then
// this). Proxied server-side because Deezer doesn't send CORS headers for
// browser fetches.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Strips version/edit qualifiers — "(Radio Edit)", "[Live]", "- Remastered
// 2011", "feat. X" — so "Song Title (Radio Edit)" and "Song Title" compare
// as the same underlying song.
function coreTitle(s: string): string {
  return normalize(
    s
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[-–—].*$/, '')
      .replace(/\b(feat\.?|ft\.?|featuring)\b.*$/i, ''),
  );
}

// Requires an exact core-title match plus a full artist-name match (not just
// a shared first word — "The Weeknd" and "The Kid LAROI" both start with
// "The", and cover/karaoke-compilation credits are often named "The ..."
// too, so a first-word check alone was still matching the wrong song).
function isCloseMatch(candidateTitle: string, candidateArtist: string, title: string, artist: string): boolean {
  if (coreTitle(candidateTitle) !== coreTitle(title)) return false;

  const cArtist = normalize(candidateArtist);
  const tArtist = normalize(artist);
  return cArtist === tArtist || cArtist.includes(tArtist) || tArtist.includes(cArtist);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { title, artist } = await req.json();
    if (!title || !artist) return json({ error: 'title and artist are required.' }, 400);

    const qs = new URLSearchParams({ q: `${title} ${artist}`, limit: '5' });
    const res = await fetch(`https://api.deezer.com/search?${qs}`);
    if (!res.ok) return json({ previewUrl: null });

    const data = await res.json();

    const match = (data.data ?? []).find((t: any) => {
      if (!t?.preview) return false;
      return isCloseMatch(t.title ?? '', t.artist?.name ?? '', title, artist);
    });

    if (!match) return json({ previewUrl: null });

    return json({
      previewUrl: match.preview as string,
      durationMs: (match.duration ?? 0) * 1000,
      coverUrl: match.album?.cover_big ?? match.album?.cover_medium ?? null,
    });
  } catch {
    return json({ previewUrl: null });
  }
});
