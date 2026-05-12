import { Sets, type TrackSnapshot } from './tables/sets';
import { requireAuth } from './common/auth';

export async function fileTrack(input: {
  setId: string;
  track: TrackSnapshot;
}) {
  const userId = requireAuth();
  const set = await Sets.get(input.setId);
  if (!set) throw new Error('Set not found.');
  if (set.ownerId !== userId) {
    throw new Error('You can only file cuts to sets you compiled.');
  }

  // Idempotent: if the track is already in this set, no-op.
  const exists = set.tracks.some(
    (t) => t.itunesTrackId === input.track.itunesTrackId,
  );
  if (exists) {
    return { set, alreadyFiled: true };
  }

  const newTrack: TrackSnapshot = {
    ...input.track,
    addedAt: input.track.addedAt || Date.now(),
  };
  const tracks = [...set.tracks, newTrack];
  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);

  const updated = await Sets.update(input.setId, {
    tracks,
    trackCount: tracks.length,
    totalDurationMs,
  });

  return { set: updated, alreadyFiled: false };
}
