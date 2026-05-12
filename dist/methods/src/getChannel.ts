import { auth, db } from '@mindstudio-ai/agent';
import { Users } from './tables/users';
import { Sets } from './tables/sets';
import { Subscriptions } from './tables/subscriptions';
import { summarizeChannel } from './common/channelSummary';

interface ChannelSetSummary {
  setId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  totalDurationMs: number;
  createdAt: number;
}

export async function getChannel(input: { handle: string }) {
  const handle = input.handle.trim().toLowerCase();
  const $ = { handle }; // bindings: lifts closure var so filter compiles to SQL
  const user = await Users.findOne((u, $) => u.handle === $.handle, $);
  if (!user) throw new Error('Channel not found.');

  const viewerId = auth.userId;
  const $owner = { ownerId: user.id }; // bindings: lifts closure var so filters compile to SQL

  const [sets, tunedInCount, tunedToCount, viewerSub, featured] = await db.batch(
    Sets.filter((s, $) => s.ownerId === $.ownerId, $owner)
      .sortBy((s) => s.created_at)
      .reverse(),
    Subscriptions.count((sub, $) => sub.channelId === $.ownerId, $owner),
    Subscriptions.count((sub, $) => sub.subscriberId === $.ownerId, $owner),
    viewerId
      ? Subscriptions.findOne(
          (sub, $) => sub.subscriberId === $.viewerId && sub.channelId === $.ownerId,
          { viewerId, ownerId: user.id }, // bindings: lifts closure var so filter compiles to SQL
        )
      : Subscriptions.findOne((sub) => sub.id === '__never__'),
    user.featuredSetId
      ? Sets.get(user.featuredSetId)
      : Sets.findOne((s) => s.id === '__never__'),
  );

  const setSummaries: ChannelSetSummary[] = sets.map((s) => ({
    setId: s.id,
    title: s.title,
    description: s.description,
    coverUrl: s.coverUrl,
    trackCount: s.trackCount,
    totalDurationMs: s.totalDurationMs,
    createdAt: s.created_at,
  }));

  return {
    channel: {
      ...summarizeChannel(user),
      notes: user.notes,
      coSigns: user.coSigns,
      featuredSetId: user.featuredSetId,
      counts: {
        sets: setSummaries.length,
        tunedIn: tunedInCount,
        tunedTo: tunedToCount,
      },
    },
    sets: setSummaries,
    featuredSet: featured ?? null,
    viewerHasSubscribed: !!viewerSub && viewerId !== user.id,
    viewerIsOwner: viewerId === user.id,
  };
}
