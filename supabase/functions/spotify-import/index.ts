// Spotify playlist resolver — uses Client Credentials (no user auth needed)
// to fetch any public playlist by URL and return its track metadata.
// The frontend handles iTunes matching and set creation after this returns.
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

async function getClientToken(): Promise<string> {
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
  return data.access_token as string;
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { url } = await req.json();
    if (!url) return json({ error: 'url is required.' }, 400);

    const playlistId = extractPlaylistId(url);
    if (!playlistId) return json({ error: 'Invalid Spotify playlist URL.' }, 400);

    const token = await getClientToken();

    // Playlist metadata
    const metaRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images,external_urls`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (metaRes.status === 404) return json({ error: 'Playlist not found.' }, 404);
    if (!metaRes.ok) return json({ error: 'Could not fetch playlist. It may be private.' }, 400);
    const meta = await metaRes.json();

    // Paginate all tracks
    const tracks: { title: string; artist: string; albumName: string; coverUrl: string | null }[] = [];
    let nextUrl: string | null =
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(name,artists,album)),next`;

    while (nextUrl) {
      const tracksRes: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!tracksRes.ok) break;
      const data = await tracksRes.json();

      for (const item of data.items ?? []) {
        const t = item?.track;
        if (!t?.name) continue;
        tracks.push({
          title: t.name,
          artist: t.artists?.[0]?.name ?? 'Unknown',
          albumName: t.album?.name ?? '',
          coverUrl: t.album?.images?.[0]?.url ?? null,
        });
      }
      nextUrl = data.next ?? null;
    }

    return json({
      name: meta.name,
      description: meta.description || null,
      coverUrl: meta.images?.[0]?.url ?? null,
      url: meta.external_urls?.spotify ?? url,
      tracks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error.';
    return json({ error: message }, 500);
  }
});
