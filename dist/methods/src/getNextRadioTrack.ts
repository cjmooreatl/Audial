import { Sets } from './tables/sets';
import { Users } from './tables/users';
import type { TrackSnapshot } from './tables/sets';

interface RadioTrack extends TrackSnapshot {
  setId: string;
  setTitle: string;
  ownerHandle: string;
  ownerDisplayName: string;
  ownerAccentColor: string;
}

// Pull a random track from across the platform with no-immediate-repeat.
// At MVP scale (low hundreds of sets) we load all sets in memory and pick.
export async function getNextRadioTrack(input: {
  recentTrackIds?: number[];
}) {
  const recent = new Set(input.recentTrackIds ?? []);
  const allSets = await Sets.filter((s) => s.trackCount > 0);

  // Build a flat list of (track, source set) entries, filtering out any
  // tracks without a preview URL or that the client has played recently.
  const pool: { track: TrackSnapshot; setId: string; setTitle: string; ownerId: string }[] = [];
  for (const set of allSets) {
    for (const t of set.tracks) {
      if (!t.previewUrl) continue;
      if (recent.has(t.itunesTrackId)) continue;
      pool.push({ track: t, setId: set.id, setTitle: set.title, ownerId: set.ownerId });
    }
  }

  // If everything was excluded by the recents filter, try again ignoring it.
  let source = pool;
  if (!source.length) {
    source = [];
    for (const set of allSets) {
      for (const t of set.tracks) {
        if (!t.previewUrl) continue;
        source.push({ track: t, setId: set.id, setTitle: set.title, ownerId: set.ownerId });
      }
    }
  }

  if (!source.length) {
    return { track: null };
  }

  const pick = source[Math.floor(Math.random() * source.length)];
  const owner = await Users.get(pick.ownerId);

  const result: RadioTrack = {
    ...pick.track,
    setId: pick.setId,
    setTitle: pick.setTitle,
    ownerHandle: owner?.handle ?? 'unknown',
    ownerDisplayName: owner?.displayName ?? 'Unknown',
    ownerAccentColor: owner?.accentColor ?? '#DCFF1A',
  };
  return { track: result };
}
