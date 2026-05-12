import { auth } from '@mindstudio-ai/agent';
import { Sets } from './tables/sets';
import { Users } from './tables/users';
import { Subscriptions } from './tables/subscriptions';
import { summarizeChannel } from './common/channelSummary';

export async function getSet(input: { setId: string }) {
  const set = await Sets.get(input.setId);
  if (!set) throw new Error('Set not found.');

  const owner = await Users.get(set.ownerId);
  if (!owner) throw new Error('Set owner not found.');

  let viewerHasSubscribed = false;
  if (auth.userId && auth.userId !== owner.id) {
    const $ = { viewerId: auth.userId, ownerId: owner.id }; // bindings: lifts closure var so filter compiles to SQL
    const sub = await Subscriptions.findOne(
      (s, $) => s.subscriberId === $.viewerId && s.channelId === $.ownerId,
      $,
    );
    viewerHasSubscribed = !!sub;
  }

  return {
    set,
    owner: summarizeChannel(owner),
    viewerHasSubscribed,
    viewerIsOwner: auth.userId === owner.id,
  };
}
