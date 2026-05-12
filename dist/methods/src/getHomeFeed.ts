import { auth, db } from '@mindstudio-ai/agent';
import { Sets, type Set as SetRow } from './tables/sets';
import { Users } from './tables/users';
import { Subscriptions } from './tables/subscriptions';
import { Spins } from './tables/spins';
import { summarizeChannel, type ChannelSummary } from './common/channelSummary';

export type FeedTab = 'subscribed' | 'on-rotation' | 'heavy-rotation' | 'drift';

interface FeedCard {
  setId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  totalDurationMs: number;
  createdAt: number;
  owner: ChannelSummary;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Strip the heavy `tracks` JSON before returning to the feed — feed cards only
// need the metadata, not the full track list.
function toFeedCard(set: SetRow & { id: string; created_at: number }, owner: ChannelSummary): FeedCard {
  return {
    setId: set.id,
    title: set.title,
    description: set.description,
    coverUrl: set.coverUrl,
    trackCount: set.trackCount,
    totalDurationMs: set.totalDurationMs,
    createdAt: set.created_at,
    owner,
  };
}

async function attachOwners(sets: (SetRow & { id: string; created_at: number })[]): Promise<FeedCard[]> {
  if (!sets.length) return [];
  const ownerIds = Array.from(new Set(sets.map((s) => s.ownerId)));
  const $ = { ownerIds }; // bindings: lifts closure var so filter compiles to SQL (IN clause)
  const owners = await Users.filter((u, $) => $.ownerIds.includes(u.id), $);
  const ownerMap = new Map(owners.map((o) => [o.id, summarizeChannel(o)]));
  return sets
    .filter((s) => ownerMap.has(s.ownerId))
    .map((s) => toFeedCard(s, ownerMap.get(s.ownerId)!));
}

export async function getHomeFeed(input: {
  tab: FeedTab;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 24, 60);
  const tab = input.tab;
  const viewerId = auth.userId;

  // SUBSCRIBED ----------------------------------------------------------
  // Only available with auth + subscriptions; otherwise we substitute the
  // On Rotation feed and let the UI label the substitution.
  if (tab === 'subscribed' && viewerId) {
    const $sub = { viewerId }; // bindings: lifts closure var so filter compiles to SQL
    const subs = await Subscriptions.filter(
      (s, $) => s.subscriberId === $.viewerId,
      $sub,
    );
    if (subs.length) {
      const channelIds = subs.map((s) => s.channelId);
      const $ = { channelIds }; // bindings: lifts closure var so filter compiles to SQL (IN clause)
      const sets = await Sets.filter((s, $) => $.channelIds.includes(s.ownerId), $)
        .sortBy((s) => s.created_at)
        .reverse()
        .take(limit);
      return { tab, cards: await attachOwners(sets), substituted: false };
    }
    // No subscriptions yet — fall through and return On Rotation.
  }

  // HEAVY ROTATION ------------------------------------------------------
  // All-time spin count, descending. We aggregate spins client-side here for
  // simplicity at MVP scale.
  if (tab === 'heavy-rotation') {
    const [allSets, allSpins] = await db.batch(
      Sets.filter((s) => s.trackCount > 0),
      Spins.toArray(),
    );
    const counts = new Map<string, number>();
    for (const sp of allSpins) {
      counts.set(sp.setId, (counts.get(sp.setId) ?? 0) + 1);
    }
    const ranked = [...allSets].sort((a, b) => {
      const ca = counts.get(a.id) ?? 0;
      const cb = counts.get(b.id) ?? 0;
      if (cb !== ca) return cb - ca;
      return b.created_at - a.created_at;
    }).slice(0, limit);
    return { tab, cards: await attachOwners(ranked), substituted: false };
  }

  // ON ROTATION (or Subscribed fallback) -------------------------------
  // Trending: spins + new subscriber count to owner within last 7d.
  if (tab === 'on-rotation' || tab === 'subscribed') {
    const since = Date.now() - SEVEN_DAYS_MS;
    const [allSets, recentSpins, recentSubs] = await db.batch(
      Sets.filter((s) => s.trackCount > 0),
      Spins.filter((sp, $) => sp.created_at >= $.since, { since }), // bindings: lifts closure var so filter compiles to SQL
      Subscriptions.filter((sub, $) => sub.created_at >= $.since, { since }), // bindings
    );
    const spinCounts = new Map<string, number>();
    for (const sp of recentSpins) {
      spinCounts.set(sp.setId, (spinCounts.get(sp.setId) ?? 0) + 1);
    }
    const subCounts = new Map<string, number>();
    for (const sub of recentSubs) {
      subCounts.set(sub.channelId, (subCounts.get(sub.channelId) ?? 0) + 1);
    }
    const ranked = [...allSets].sort((a, b) => {
      const sa = (spinCounts.get(a.id) ?? 0) + (subCounts.get(a.ownerId) ?? 0);
      const sb = (spinCounts.get(b.id) ?? 0) + (subCounts.get(b.ownerId) ?? 0);
      if (sb !== sa) return sb - sa;
      return b.created_at - a.created_at;
    }).slice(0, limit);
    return {
      tab,
      cards: await attachOwners(ranked),
      substituted: tab === 'subscribed', // we fell back from subscribed
    };
  }

  // DRIFT ---------------------------------------------------------------
  // Random sample. Excludes empty sets.
  const allSets = await Sets.filter((s) => s.trackCount > 0);
  // Fisher-Yates shuffle, take limit.
  const shuffled = [...allSets];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, limit);
  return { tab: 'drift', cards: await attachOwners(picked), substituted: false };
}
