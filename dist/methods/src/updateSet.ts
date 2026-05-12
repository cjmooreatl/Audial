import { Sets, type TrackSnapshot } from './tables/sets';
import { requireAuth } from './common/auth';

export async function updateSet(input: {
  setId: string;
  title?: string;
  description?: string | null;
  coverUrl?: string | null;
  tracks?: TrackSnapshot[];
}) {
  const userId = requireAuth();
  const set = await Sets.get(input.setId);
  if (!set) throw new Error('Set not found.');
  if (set.ownerId !== userId) throw new Error('Only the curator can edit this set.');

  const patch: Partial<{
    title: string;
    description: string | null;
    coverUrl: string | null;
    tracks: TrackSnapshot[];
    trackCount: number;
    totalDurationMs: number;
  }> = {};

  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed) throw new Error('Title is required.');
    patch.title = trimmed;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;

  if (input.tracks !== undefined) {
    patch.tracks = input.tracks;
    patch.trackCount = input.tracks.length;
    patch.totalDurationMs = input.tracks.reduce(
      (sum, t) => sum + (t.durationMs || 0),
      0,
    );
  }

  const updated = await Sets.update(input.setId, patch);
  return { set: updated };
}
