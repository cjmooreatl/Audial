import { Sets, type TrackSnapshot } from './tables/sets';
import { requireAuth } from './common/auth';
import { resolvePlaylist } from './common/spotify';
import { lookupTrackByQuery } from './common/itunes';
import { seedCoverFor } from './common/seedCovers';

export async function importSpotifyPlaylist(input: { url: string }) {
  const userId = requireAuth();

  if (!input.url?.trim()) {
    throw new Error('Paste a Spotify playlist URL.');
  }

  // Throws with descriptive errors for invalid/private/missing playlists, and
  // with code spotify_not_configured if SPOTIFY_CLIENT_ID is unset.
  const playlist = await resolvePlaylist(input.url);

  if (!playlist.tracks.length) {
    throw new Error('Source has no tracks.');
  }

  // For each Spotify track, look up an iTunes match for preview audio. Run
  // lookups in parallel — iTunes Search has no auth and tolerates burst usage.
  const now = Date.now();
  const lookups = await Promise.all(
    playlist.tracks.map((t) => lookupTrackByQuery(t.title, t.artist)),
  );

  const tracks: TrackSnapshot[] = lookups
    .map((iTunes, i) => {
      const src = playlist.tracks[i];
      // Prefer iTunes data when found — it has the previewable URL we need.
      // Fall back to Spotify metadata with no preview if iTunes finds no match.
      if (iTunes) {
        return { ...iTunes, addedAt: now };
      }
      return {
        itunesTrackId: 0,
        title: src.title,
        artist: src.artist,
        albumName: src.albumName,
        coverUrl: src.coverUrl,
        previewUrl: null,
        durationMs: 0,
        addedAt: now,
      };
    })
    // Drop entries with no preview and no iTunes ID — they're unplayable and
    // identifiable. We keep the rest (including iTunes-found tracks without
    // previews) so the set stays meaningful.
    .filter((t) => t.itunesTrackId || t.previewUrl);

  if (!tracks.length) {
    throw new Error('No matching tracks found on iTunes for this source.');
  }

  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);
  const coverUrl = playlist.coverUrl ?? seedCoverFor(playlist.name);

  const set = await Sets.push({
    ownerId: userId,
    title: playlist.name,
    description: playlist.description || null,
    coverUrl,
    tracks,
    trackCount: tracks.length,
    totalDurationMs,
    spotifyImportUrl: playlist.url,
  });

  return { set };
}
