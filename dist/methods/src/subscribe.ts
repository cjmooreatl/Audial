import { Subscriptions } from './tables/subscriptions';
import { requireAuth } from './common/auth';

export async function subscribe(input: { channelId: string }) {
  const userId = requireAuth();

  if (input.channelId === userId) {
    throw new Error("You can't subscribe to your own channel.");
  }

  // Upsert is the right primitive here — duplicate subscribes become no-ops.
  await Subscriptions.upsert(['subscriberId', 'channelId'], {
    subscriberId: userId,
    channelId: input.channelId,
  });

  return { subscribed: true };
}
