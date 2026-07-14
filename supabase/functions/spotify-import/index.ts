// @ts-nocheck
// Spotify catalog search — uses Client Credentials (app-only auth, no
// per-user login, no Extended Quota requirement) to widen the search bar's
// catalog beyond iTunes' Search API. Never returns a preview_url (Spotify
// stopped providing them reliably via the Web API in Nov 2024); the frontend
// resolves playback via iTunes/Deezer previews separately.
//
// Playlist-URL import used to live here too, but Spotify's Web API returns
// 403 on playlist track-listing reads for Client Credentials tokens (as of
// the same Nov 2024 policy change) — only per-user Authorization Code tokens
// can read a playlist's tracks now, which is gated behind Extended Quota.
// That feature is shelved on the spotify-full-playback branch.
//
// Deploy secrets:
//   supabase secrets set SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

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

// Cached across warm invocations of this isolate — avoids re-authenticating
// on every request for a token that's valid up to an hour.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getClientToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Spotify credentials are not configured on this server.');
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Failed to obtain Spotify client credentials token.');
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function search(query: string, limit: number) {
  const token = await getClientToken();
  const qs = new URLSearchParams({ q: query, type: 'track', limit: String(Math.min(limit, 50)) });
  const res = await fetch(`https://api.spotify.com/v1/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return json({ error: `Spotify search failed: HTTP ${res.status}` }, 502);

  const data = await res.json();
  const tracks = (data.tracks?.items ?? [])
    .filter((t: any) => t?.type === 'track' && t?.id)
    .map((t: any) => ({
      spotifyId: t.id as string,
      title: t.name as string,
      artist: (t.artists?.[0]?.name ?? 'Unknown') as string,
      albumName: (t.album?.name ?? '') as string,
      coverUrl: (t.album?.images?.[0]?.url ?? null) as string | null,
      durationMs: (t.duration_ms ?? 0) as number,
    }));

  return json({ tracks });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { query, limit } = await req.json();
    if (!query) return json({ error: 'query is required.' }, 400);
    return await search(query, limit ?? 10);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error.';
    return json({ error: message }, 500);
  }
});
