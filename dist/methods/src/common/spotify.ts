// Spotify Web API helpers — Client Credentials only, used for playlist import.
// Spotify removed preview_url from their API in November 2024, so we use this
// only to RESOLVE the playlist's track list. Previews come from iTunes.

interface PlaylistTrack {
  title: string;
  artist: string;
  albumName: string;
  coverUrl: string;
}

interface ResolvedPlaylist {
  name: string;
  description: string;
  coverUrl: string | null;
  url: string;
  tracks: PlaylistTrack[];
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function spotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export async function getAccessToken(): Promise<string> {
  if (!spotifyConfigured()) {
    const err = new Error(
      'Spotify import is unavailable. The platform admin needs to set the SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET secrets.',
    );
    (err as any).code = 'spotify_not_configured';
    throw err;
  }

  // Refresh if missing or within 60s of expiry.
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }

  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed (${res.status}).`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.value;
}

// Extract a Spotify playlist ID from a URL or URI.
// Handles formats:
//   https://open.spotify.com/playlist/37i9dQZF1DX...
//   spotify:playlist:37i9dQZF1DX...
//   37i9dQZF1DX... (raw ID)
export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  // URL form
  const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  // URI form
  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];
  // Raw ID
  if (/^[a-zA-Z0-9]{16,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function resolvePlaylist(urlOrId: string): Promise<ResolvedPlaylist> {
  const id = parsePlaylistId(urlOrId);
  if (!id) {
    const err = new Error('Source not found. Check the URL.');
    (err as any).code = 'spotify_invalid_url';
    throw err;
  }

  const token = await getAccessToken();
  const meta = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (meta.status === 404) {
    const err = new Error('Source not found. Check the URL.');
    (err as any).code = 'spotify_playlist_not_found';
    throw err;
  }
  if (meta.status === 403 || meta.status === 401) {
    const err = new Error(
      'Source is private. Make it public on Spotify or compile from scratch.',
    );
    (err as any).code = 'spotify_playlist_private';
    throw err;
  }
  if (!meta.ok) {
    throw new Error(`Spotify playlist request failed (${meta.status}).`);
  }
  const playlist = (await meta.json()) as any;

  // Walk through pages of tracks; cap at 200 tracks for sanity.
  const tracks: PlaylistTrack[] = [];
  let next: string | null = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
  while (next && tracks.length < 200) {
    const r: Response = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) break;
    const page = (await r.json()) as any;
    for (const item of page.items ?? []) {
      const t = item.track;
      if (!t || !t.name || !t.artists?.length) continue;
      tracks.push({
        title: t.name,
        artist: t.artists.map((a: any) => a.name).join(', '),
        albumName: t.album?.name ?? '',
        coverUrl: t.album?.images?.[0]?.url ?? '',
      });
    }
    next = page.next ?? null;
  }

  return {
    name: playlist.name ?? 'Untitled set',
    description: playlist.description ?? '',
    coverUrl: playlist.images?.[0]?.url ?? null,
    url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${id}`,
    tracks,
  };
}
