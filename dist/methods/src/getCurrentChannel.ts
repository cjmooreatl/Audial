import { auth, db } from '@mindstudio-ai/agent';
import { Users } from './tables/users';
import { Sets } from './tables/sets';
import { Subscriptions } from './tables/subscriptions';

// Returns the current viewer's full channel data, or null if anonymous.
// Always safe to call without auth.
export async function getCurrentChannel() {
  const userId = auth.userId;
  if (!userId) return { channel: null };

  const user = await Users.get(userId);
  if (!user) return { channel: null };

  // Counts for the channel masthead. Batched into a single round-trip.
  const $ = { userId }; // bindings: lifts closure var so filters compile to SQL
  const [setCount, tunedInCount, tunedToCount] = await db.batch(
    Sets.count((s, $) => s.ownerId === $.userId, $),
    Subscriptions.count((sub, $) => sub.channelId === $.userId, $),
    Subscriptions.count((sub, $) => sub.subscriberId === $.userId, $),
  );

  return {
    channel: {
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      notes: user.notes,
      accentColor: user.accentColor,
      featuredSetId: user.featuredSetId,
      coSigns: user.coSigns,
      avatarUrl: user.avatarUrl,
      onboardingComplete: !!user.handle,
      counts: {
        sets: setCount,
        tunedIn: tunedInCount,
        tunedTo: tunedToCount,
      },
    },
  };
}
