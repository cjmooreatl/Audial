import { db } from '@mindstudio-ai/agent';
import { Sets } from './tables/sets';
import { Users } from './tables/users';
import { Subscriptions } from './tables/subscriptions';
import { summarizeChannel, type ChannelSummary } from './common/channelSummary';
import { searchTracks } from './common/itunes';
import type { TrackSnapshot } from './tables/sets';

interface SetMatch {
  setId: string;
  title: string;
  coverUrl: string | null;
  trackCount: number;
  owner: ChannelSummary;
}

interface ChannelMatch {
  channel: ChannelSummary;
  notes: string | null;
  tunedIn: number;
}

export async function searchAudial(input: {
  query: string;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 8, 20);
  const q = input.query.trim().toLowerCase();

  // Empty query — return featured curators (top by tuned-in count) and a
  // curated trending tracks call against iTunes.
  if (!q) {
    const [allUsers, allSubs] = await db.batch(
      Users.filter((u) => u.handle !== null),
      Subscriptions.toArray(),
    );
    const subCounts = new Map<string, number>();
    for (const s of allSubs) subCounts.set(s.channelId, (subCounts.get(s.channelId) ?? 0) + 1);
    const featured = [...allUsers]
      .sort((a, b) => (subCounts.get(b.id) ?? 0) - (subCounts.get(a.id) ?? 0))
      .slice(0, limit)
      .map((u) => ({
        channel: summarizeChannel(u),
        notes: u.notes,
        tunedIn: subCounts.get(u.id) ?? 0,
      }));
    const tracks = await searchTracks('new music friday', 6);
    return {
      query: '',
      sets: [] as SetMatch[],
      channels: featured,
      tracks: tracks as TrackSnapshot[],
    };
  }

  // SQL-backed substring search via .includes() compiles to LIKE.
  // We lowercase via `||$.q` patterns won't work on SQLite without functions,
  // so we use a loose includes that matches mixed case poorly. The pragmatic
  // fix: filter in JS for small datasets at MVP scale.
  const [allSets, allUsers] = await db.batch(
    Sets.filter((s) => s.trackCount > 0),
    Users.filter((u) => u.handle !== null),
  );

  const setMatches = allSets
    .filter((s) => s.title.toLowerCase().includes(q))
    .slice(0, limit);
  const channelMatches = allUsers
    .filter(
      (u) =>
        (u.handle ?? '').toLowerCase().includes(q) ||
        (u.displayName ?? '').toLowerCase().includes(q),
    )
    .slice(0, limit);

  // Look up owners for set matches and tuned-in counts for channels.
  const ownerIds = Array.from(new Set(setMatches.map((s) => s.ownerId)));
  const channelMatchIds = channelMatches.map((c) => c.id);

  const [owners, tunedInRows] = await db.batch(
    Users.filter((u, $) => $.ownerIds.includes(u.id), { ownerIds }), // bindings
    Subscriptions.filter(
      (sub, $) => $.channelIds.includes(sub.channelId),
      { channelIds: channelMatchIds }, // bindings
    ),
  );
  const ownerMap = new Map(owners.map((o) => [o.id, summarizeChannel(o)]));
  const tunedInCounts = new Map<string, number>();
  for (const r of tunedInRows) {
    tunedInCounts.set(r.channelId, (tunedInCounts.get(r.channelId) ?? 0) + 1);
  }

  const sets: SetMatch[] = setMatches
    .filter((s) => ownerMap.has(s.ownerId))
    .map((s) => ({
      setId: s.id,
      title: s.title,
      coverUrl: s.coverUrl,
      trackCount: s.trackCount,
      owner: ownerMap.get(s.ownerId)!,
    }));

  const channels: ChannelMatch[] = channelMatches.map((u) => ({
    channel: summarizeChannel(u),
    notes: u.notes,
    tunedIn: tunedInCounts.get(u.id) ?? 0,
  }));

  // Track lane via iTunes search
  const tracks = await searchTracks(input.query, 8);

  return { query: input.query, sets, channels, tracks };
}
