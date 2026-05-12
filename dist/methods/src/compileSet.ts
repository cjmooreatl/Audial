import { Sets, type TrackSnapshot } from './tables/sets';
import { requireAuth } from './common/auth';
import { seedCoverFor } from './common/seedCovers';

export async function compileSet(input: {
  title: string;
  description?: string;
  coverUrl?: string;
  tracks?: TrackSnapshot[];
}) {
  const userId = requireAuth();

  const title = input.title.trim();
  if (!title) throw new Error('Title is required.');

  const tracks = (input.tracks ?? []).map((t) => ({
    ...t,
    addedAt: t.addedAt || Date.now(),
  }));

  // Cover precedence: user-provided > first track's album art > deterministic seed cover.
  const coverUrl =
    input.coverUrl?.trim() || tracks[0]?.coverUrl || seedCoverFor(title);

  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);

  const set = await Sets.push({
    ownerId: userId,
    title,
    description: input.description?.trim() || null,
    coverUrl,
    tracks,
    trackCount: tracks.length,
    totalDurationMs,
    spotifyImportUrl: null,
  });

  return { set };
}
