// A brand new user landing on a populated platform. They have no sets, no
// subscriptions, no co-signs — but the world around them is alive with
// curators and content. Tests the empty-channel UX from the inside.

import { Users } from '../src/tables/users';
import { Sets } from '../src/tables/sets';
import { Subscriptions } from '../src/tables/subscriptions';
import { Spins } from '../src/tables/spins';
import { buildSeedTrackPool, carve } from './_helpers/seedTracks';
import { SEED_USERS } from './_helpers/seedUsers';
import { SEED_COVERS } from '../src/common/seedCovers';

export async function emptyDebut() {
  const pool = await buildSeedTrackPool();
  if (pool.length < 12) {
    throw new Error('Seed track pool is too small.');
  }
  const now = Date.now();

  // Skip the first user (moss.fm — that's the test user) and seed the others
  // as full curators around them. The test user themselves stays empty.
  const others = SEED_USERS.slice(1);

  const userRows = await Promise.all(
    others.map((u) =>
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

  // Test user — `moss.fm` for the dev bypass — joins as a brand new account
  // with no handle yet, so the onboarding flow can run.
  await Users.push({
    email: 'remy@mindstudio.ai',
    roles: [],
    handle: null,
    displayName: null,
    notes: null,
    accentColor: '#DCFF1A',
    coSigns: [],
    featuredSetId: null,
    avatarUrl: null,
  });

  // Compile sets for the surrounding curators.
  for (let i = 0; i < userRows.length; i++) {
    const user = userRows[i];
    const seed = others[i];
    const compiled = await Promise.all(
      seed.sets.map((s) => {
        const tracks = carve(pool, s.offset, s.count);
        const totalMs = tracks.reduce((sum, t) => sum + t.durationMs, 0);
        return Sets.push({
          ownerId: user.id,
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
    if (compiled.length) {
      await Users.update(user.id, { featuredSetId: compiled[0].id });
    }
  }

  // A few spins so On Rotation isn't flat.
  const allSets = await Sets.toArray();
  const spins = Array.from({ length: 80 }, () => {
    const u = userRows[Math.floor(Math.random() * userRows.length)];
    const s = allSets[Math.floor(Math.random() * allSets.length)];
    return { userId: u.id, setId: s.id, trackItunesId: null };
  });
  if (spins.length) await Spins.push(spins);

  // No subscriptions involving the test user — empty Subscribed feed.
  // A few subs between the other curators so the platform feels alive.
  const otherIds = userRows.map((u) => u.id);
  const subEntries: { subscriberId: string; channelId: string }[] = [];
  for (const sub of userRows) {
    const targets = otherIds.filter((id) => id !== sub.id);
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    for (const ch of targets.slice(0, 2)) {
      subEntries.push({ subscriberId: sub.id, channelId: ch });
    }
  }
  await Subscriptions.push(subEntries);
}
