// Spotify OAuth (PKCE) + API helpers.
// PKCE lets us do the full auth flow in the browser with no client secret.

import { supabase } from './supabase';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = `${window.location.origin}/auth/spotify/callback`;

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-recently-played',
  'user-library-read',
  'streaming',
  'user-read-private',
  'user-read-email',
].join(' ');

function generateCodeVerifier(length = 128): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function startSpotifyOAuth(): Promise<void> {
  if (!crypto?.subtle) {
    throw new Error(
      'Secure context required. Open the app at http://localhost:5173 instead of an IP address.',
    );
  }
  const verifier = generateCodeVerifier();
  const challenge = await sha256Base64Url(verifier);
  sessionStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString().replace(/\+/g, '%20')}`;
  window.location.href = authUrl;
}

export async function exchangeSpotifyCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  isPremium: boolean;
}> {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) throw new Error('No code verifier found. Please try connecting again.');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error_description ?? 'Token exchange failed.');
  }

  const token = await res.json();
  sessionStorage.removeItem('spotify_code_verifier');

  // Fetch profile to get user ID + premium status
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  let userId = '';
  let isPremium = false;
  if (profileRes.ok) {
    const profile = await profileRes.json();
    userId = profile.id ?? '';
    isPremium = profile.product === 'premium';
  }

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    userId,
    isPremium,
  };
}

export async function saveSpotifyTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  isPremium: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('users')
    .update({
      spotify_connected: true,
      spotify_access_token: tokens.accessToken,
      spotify_refresh_token: tokens.refreshToken,
      spotify_token_expires_at: tokens.expiresAt,
      spotify_user_id: tokens.userId,
      spotify_is_premium: tokens.isPremium,
    })
    .eq('id', user.id);

  if (error) throw error;
}

async function doTokenRefresh(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Spotify token refresh failed.');
  const data = await res.json();
  return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
}

// Returns a valid access token, refreshing if expired. Returns null if not connected.
export async function getValidSpotifyToken(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('spotify_connected, spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
    .eq('id', user.id)
    .single();

  if (!data?.spotify_connected || !data.spotify_access_token) return null;

  // Still valid with a 60s buffer (coerce to number — bigint columns come back as strings)
  if (Number(data.spotify_token_expires_at ?? 0) > Date.now() + 60_000) {
    return data.spotify_access_token;
  }

  if (!data.spotify_refresh_token) return null;

  const { accessToken, expiresAt } = await doTokenRefresh(data.spotify_refresh_token);

  await supabase
    .from('users')
    .update({ spotify_access_token: accessToken, spotify_token_expires_at: expiresAt })
    .eq('id', user.id);

  return accessToken;
}

export async function disconnectSpotify(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('users')
    .update({
      spotify_connected: false,
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
      spotify_user_id: null,
      spotify_is_premium: false,
    })
    .eq('id', user.id);

  if (error) throw error;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  url: string | null;
}

export interface SpotifyTrack {
  spotifyId: string;
  title: string;
  artist: string;
  albumName: string;
  coverUrl: string | null;
  previewUrl: string | null;
  durationMs: number;
}

// FNV-1a 32-bit hash — maps a Spotify track ID to a stable integer for deduplication.
export function hashSpotifyId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export async function getPlaylistById(token: string, playlistId: string): Promise<{
  name: string;
  description: string | null;
  coverUrl: string | null;
  url: string | null;
  tracks: SpotifyTrack[];
}> {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as any).error?.message ?? `HTTP ${res.status}`;
    const hint = res.status === 401 || res.status === 403
      ? ' Disconnect and reconnect Spotify to refresh your permissions.'
      : '';
    throw new Error(`${msg}.${hint}`);
  }
  const meta = await res.json();
  // Spotify renamed `tracks` → `items` in the playlist response (the value is still a paged object)
  const tracksPage = meta.items ?? meta.tracks;
  const tracks: SpotifyTrack[] = [];
  const processItems = (items: any[]) => {
    for (const item of items ?? []) {
      if (item?.is_local) continue;
      const t = item?.item ?? item?.track;
      if (!t?.name || t?.type !== 'track') continue;
      tracks.push({
        spotifyId: t.id ?? '',
        title: t.name,
        artist: t.artists?.[0]?.name ?? 'Unknown',
        albumName: t.album?.name ?? '',
        coverUrl: t.album?.images?.[0]?.url ?? null,
        previewUrl: t.preview_url ?? null,
        durationMs: t.duration_ms ?? 0,
      });
    }
  };

  processItems(tracksPage?.items ?? []);

  let nextUrl: string | null = tracksPage?.next ?? null;
  while (nextUrl) {
    const r = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) break;
    const data = await r.json();
    processItems(data.items ?? []);
    nextUrl = data.next ?? null;
  }

  return {
    name: meta.name,
    description: meta.description || null,
    coverUrl: meta.images?.[0]?.url ?? null,
    url: meta.external_urls?.spotify ?? null,
    tracks,
  };
}

export async function getUserPlaylists(token: string, limit = 50): Promise<SpotifyPlaylist[]> {
  const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as any).error?.message ?? `HTTP ${res.status}`;
    const needsReconnect = res.status === 401 || res.status === 403;
    const hint = needsReconnect ? ' Disconnect and reconnect Spotify to refresh your permissions.' : '';
    throw new Error(`${detail}.${hint}`);
  }
  const data = await res.json();

  return (data.items ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || null,
    coverUrl: p.images?.[0]?.url ?? null,
    trackCount: p.tracks?.total ?? 0,
    url: p.external_urls?.spotify ?? null,
  }));
}

export async function getPlaylistTracks(token: string, playlistId: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Failed to fetch tracks: HTTP ${res.status} — ${(body as any).error?.message ?? 'unknown'}`);
    }
    const data = await res.json();

    for (const item of data.items ?? []) {
      if (item?.is_local) continue;
      const t = item?.item ?? item?.track;
      if (!t?.name || t?.type !== 'track') continue;
      tracks.push({
        spotifyId: t.id ?? '',
        title: t.name,
        artist: t.artists?.[0]?.name ?? 'Unknown',
        albumName: t.album?.name ?? '',
        coverUrl: t.album?.images?.[0]?.url ?? null,
        previewUrl: t.preview_url ?? null,
        durationMs: t.duration_ms ?? 0,
      });
    }
    url = data.next ?? null;
  }

  return tracks;
}
