// An established curator with a fully built channel — but only 1-2 subscribers
// and nobody they subscribe to. Tests the owner-perspective on a populated
// channel inside a sparse social graph.

import { Users } from '../src/tables/users';
import { Sets } from '../src/tables/sets';
import { Subscriptions } from '../src/tables/subscriptions';
import { Spins } from '../src/tables/spins';
import { buildSeedTrackPool, carve } from './_helpers/seedTracks';
import { SEED_USERS } from './_helpers/seedUsers';
import { SEED_COVERS } from '../src/common/seedCovers';

export async function soloCurator() {
  const pool = await buildSeedTrackPool();
  if (pool.length < 12) {
    throw new Error('Seed track pool is too small.');
  }
  const now = Date.now();

  // Test user is moss.fm with their full channel built out.
  const moss = SEED_USERS[0];
  const mossRow = await Users.push({
    email: moss.email,
    roles: [],
    handle: moss.handle,
    displayName: moss.displayName,
    notes: moss.notes,
    accentColor: moss.accentColor,
    coSigns: [],
    featuredSetId: null,
    avatarUrl: null,
  });

  const compiled = await Promise.all(
    moss.sets.map((s) => {
      const tracks = carve(pool, s.offset, s.count);
      const totalMs = tracks.reduce((sum, t) => sum + t.durationMs, 0);
      return Sets.push({
        ownerId: mossRow.id,
        title: s.title,
        description: s.description,
        coverUrl: SEED_COVERS[s.cover],
        tracks: tracks.map((t) => ({ ...t, addedAt: now })),
        trackCount: tracks.length,
        totalDurationMs: totalMs,
        spotifyImportUrl: null,
      });
    }),
  );
  await Users.update(mossRow.id, { featuredSetId: compiled[0].id });

  // Two random listener accounts who have subscribed to moss but not vice versa.
  const listeners = await Promise.all(
    [SEED_USERS[1], SEED_USERS[2]].map((u) =>
      Users.push({
        email: u.email,
        roles: [],
        handle: u.handle,
        displayName: u.displayName,
        notes: u.notes,
        accentColor: u.accentColor,
        coSigns: [],
        featuredSetId: null,
        avatarUrl: null,
      }),
    ),
  );
  await Subscriptions.push(
    listeners.map((l) => ({ subscriberId: l.id, channelId: mossRow.id })),
  );

  // A handful of spins on moss's sets.
  const spins = compiled.flatMap((s) =>
    Array.from({ length: 10 }, () => ({
      userId: listeners[Math.floor(Math.random() * listeners.length)].id,
      setId: s.id,
      trackItunesId: null,
    })),
  );
  await Spins.push(spins);
}
