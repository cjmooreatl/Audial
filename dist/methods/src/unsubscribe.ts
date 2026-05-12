import { Subscriptions } from './tables/subscriptions';
import { requireAuth } from './common/auth';

export async function unsubscribe(input: { channelId: string }) {
  const userId = requireAuth();
  const $ = { userId, channelId: input.channelId }; // bindings: lifts closure var so removeAll compiles to SQL
  const removed = await Subscriptions.removeAll(
    (s, $) => s.subscriberId === $.userId && s.channelId === $.channelId,
    $,
  );
  return { unsubscribed: true, removed };
}
