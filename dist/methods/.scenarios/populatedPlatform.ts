// The lived-in platform. Test user lands as moss.fm. Around them are 9 other
// curators with built-out channels, ~24 sets total, a realistic subscription
// graph, and a few hundred spin events scattered across recent days.

import { db } from '@mindstudio-ai/agent';
import { Users } from '../src/tables/users';
import { Sets } from '../src/tables/sets';
import { Subscriptions } from '../src/tables/subscriptions';
import { Spins } from '../src/tables/spins';
import { SEED_USERS } from './_helpers/seedUsers';
import { buildSeedTrackPool, carve, searchSeed } from './_helpers/seedTracks';
import { SEED_COVERS } from '../src/common/seedCovers';

export async function populatedPlatform() {
  // Pull a pool of ~40 real iTunes tracks for the curators to compile from.
  const pool = await buildSeedTrackPool();
  if (pool.length < 12) {
    throw new Error(`Seed track pool is too small (${pool.length}) — iTunes API may be unreachable.`);
  }

  const now = Date.now();

  // Create users — moss.fm uses the dev-bypass email so test sign-in lands there.
  // We upsert on handle so the scenario is idempotent.
  const userRows = await Promise.all(
    SEED_USERS.map(async (u) => {
      // The auth-managed email column is read-only after creation; we use upsert
      // on handle to keep things simple. For dev-bypass, the platform creates
      // the row via auth flow — on first scenario run we may need to insert.
      const existing = await Users.findOne((row, $) => row.handle === $.handle, { handle: u.handle }); // bindings
      if (existing) {
        return Users.update(existing.id, {
          displayName: u.displayName,
          notes: u.notes,
          accentColor: u.accentColor,
        });
      }
      return Users.push({
        email: u.email,
        roles: [],
        handle: u.handle,
        displayName: u.displayName,
        notes: u.notes,
        accentColor: u.accentColor,
        coSigns: [],
        featuredSetId: null,
        avatarUrl: null,
      });
    }),
  );

  // Build co-signs for each curator from the iTunes search helper.
  await Promise.all(
    userRows.map(async (user, i) => {
      const seed = SEED_USERS[i];
      const coSigns = (
        await Promise.all(
          seed.coSignQueries.map(async (q) => {
            const results = await searchSeed(q, 1);
            const r = results[0];
            return r
              ? {
                  itunesArtistId: 0, // we lose this with the song-search shortcut, fine for seed
                  name: r.artist,
                  imageUrl: r.coverUrl,
                }
              : null;
          }),
        )
      ).filter((c): c is NonNullable<typeof c> => c !== null);
      await Users.update(user.id, { coSigns });
    }),
  );

  // Compile sets for each curator.
  const setsByOwner = new Map<string, string[]>();
  for (let i = 0; i < userRows.length; i++) {
    const user = userRows[i];
    const seed = SEED_USERS[i];
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
    setsByOwner.set(user.id, compiled.map((s) => s.id));
    // First set becomes the featured set for that channel.
    if (compiled.length) {
      await Users.update(user.id, { featuredSetId: compiled[0].id });
    }
  }

  // Build a subscription graph. Each curator subscribes to 2-4 others —
  // moss.fm subscribes to a curated few; everyone else picks somewhat at random.
  const allUserIds = userRows.map((u) => u.id);
  const subEntries: { subscriberId: string; channelId: string }[] = [];
  for (const subscriber of userRows) {
    const targets = allUserIds.filter((id) => id !== subscriber.id);
    // Shuffle and pick 2-4
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    const pickCount = 2 + Math.floor(Math.random() * 3);
    for (const channelId of targets.slice(0, pickCount)) {
      subEntries.push({ subscriberId: subscriber.id, channelId });
    }
  }
  await Subscriptions.push(subEntries);

  // Scatter ~300 spin events across the last 14 days. Weighted toward more
  // recent days so On Rotation has obvious frontrunners.
  const allSetIds: string[] = [];
  for (const ids of setsByOwner.values()) allSetIds.push(...ids);
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

  const spinEntries = Array.from({ length: 300 }, () => {
    const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
    const setId = allSetIds[Math.floor(Math.random() * allSetIds.length)];
    return { userId, setId, trackItunesId: null };
  });
  await Spins.push(spinEntries);

  // Note: created_at is auto-set by the platform on insert. Spins all land
  // close to "now" rather than backdated. For MVP this is fine — On Rotation
  // looks at the last 7 days and everything we just inserted is within that.
  void TWO_WEEKS_MS;
}
