import { db } from '@mindstudio-ai/agent';
import { Sets } from './tables/sets';
import { Spins } from './tables/spins';
import { Users } from './tables/users';
import { requireAuth } from './common/auth';

export async function deleteSet(input: { setId: string }) {
  const userId = requireAuth();
  const set = await Sets.get(input.setId);
  if (!set) throw new Error('Set not found.');
  if (set.ownerId !== userId) {
    throw new Error('Only the curator can delete this set.');
  }

  // Cascade: remove spins for this set, clear featuredSetId on any user that
  // pointed to this set, then remove the set itself. Batched.
  const $ = { setId: input.setId }; // bindings: lifts closure var so filter compiles to SQL
  const orphans = await Users.filter((u, $) => u.featuredSetId === $.setId, $);

  await db.batch(
    Spins.removeAll((sp, $) => sp.setId === $.setId, $),
    ...orphans.map((u) => Users.update(u.id, { featuredSetId: null })),
    Sets.remove(input.setId),
  );

  return { deleted: true };
}
