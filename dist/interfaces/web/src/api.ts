import { supabase } from './lib/supabase';
import { searchTracks as iTunesSearchTracks, searchArtists as iTunesSearchArtists, lookupTrackByQuery } from './lib/itunes';
import { seedCoverFor } from './brand/seedCovers';

export interface TrackSnapshot {
  itunesTrackId: number;
  title: string;
  artist: string;
  albumName: string;
  coverUrl: string;
  previewUrl: string | null;
  durationMs: number;
  addedAt: number;
}

export interface CoSign {
  itunesArtistId: number;
  name: string;
  imageUrl: string;
}

export interface ChannelSummary {
  id: string;
  handle: string;
  displayName: string;
  accentColor: string;
  avatarUrl: string | null;
}

export interface CurrentChannel {
  id: string;
  email: string;
  handle: string | null;
  displayName: string | null;
  notes: string | null;
  accentColor: string;
  featuredSetId: string | null;
  coSigns: CoSign[];
  avatarUrl: string | null;
  onboardingComplete: boolean;
  counts: { sets: number; tunedIn: number; tunedTo: number };
  spotifyConnected: boolean;
  spotifyIsPremium: boolean;
}

export interface FeedCard {
  setId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  totalDurationMs: number;
  createdAt: number;
  owner: ChannelSummary;
}

export interface ChannelSetSummary {
  setId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackCount: number;
  totalDurationMs: number;
  createdAt: number;
}

export interface ChannelFull {
  id: string;
  handle: string;
  displayName: string;
  accentColor: string;
  avatarUrl: string | null;
  notes: string | null;
  coSigns: CoSign[];
  featuredSetId: string | null;
  counts: { sets: number; tunedIn: number; tunedTo: number };
}

export interface SetFull {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  tracks: TrackSnapshot[];
  trackCount: number;
  totalDurationMs: number;
  spotifyImportUrl: string | null;
  created_at: number;
  updated_at: number;
}

export interface RadioTrack extends TrackSnapshot {
  setId: string;
  setTitle: string;
  ownerHandle: string;
  ownerDisplayName: string;
  ownerAccentColor: string;
}

export type FeedTab = 'subscribed' | 'on-rotation' | 'heavy-rotation' | 'drift';

// --- Row mappers ---

function rowToSet(row: any): SetFull {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url,
    tracks: row.tracks ?? [],
    trackCount: row.track_count,
    totalDurationMs: row.total_duration_ms,
    spotifyImportUrl: row.spotify_import_url,
    created_at: new Date(row.created_at).getTime(),
    updated_at: new Date(row.updated_at ?? row.created_at).getTime(),
  };
}

function rowToChannelSummary(row: any): ChannelSummary {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    accentColor: row.accent_color,
    avatarUrl: row.avatar_url ?? null,
  };
}

function rowToFeedCard(row: any): FeedCard {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner;
  return {
    setId: row.id,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url,
    trackCount: row.track_count,
    totalDurationMs: row.total_duration_ms,
    createdAt: new Date(row.created_at).getTime(),
    owner: {
      id: owner?.id ?? '',
      handle: owner?.handle ?? '',
      displayName: owner?.display_name ?? '',
      accentColor: owner?.accent_color ?? '#DCFF1A',
      avatarUrl: owner?.avatar_url ?? null,
    },
  };
}

// --- API ---

const api = {
  async getCurrentChannel(): Promise<{ channel: CurrentChannel | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { channel: null };

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) return { channel: null };

    return {
      channel: {
        id: data.id,
        email: data.email,
        handle: data.handle,
        displayName: data.display_name,
        notes: data.notes,
        accentColor: data.accent_color,
        featuredSetId: data.featured_set_id,
        coSigns: data.co_signs ?? [],
        avatarUrl: data.avatar_url,
        onboardingComplete: data.onboarding_complete,
        counts: { sets: 0, tunedIn: 0, tunedTo: 0 },
      },
    };
  },

  async completeOnboarding(input: {
    handle: string;
    displayName: string;
    notes?: string;
    accentColor?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const { data, error } = await supabase
      .from('users')
      .update({
        handle: input.handle.trim().toLowerCase(),
        display_name: input.displayName.trim(),
        notes: input.notes?.trim() || null,
        accent_color: input.accentColor ?? '#DCFF1A',
        onboarding_complete: true,
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return {
      channel: {
        id: data.id,
        handle: data.handle,
        displayName: data.display_name,
        notes: data.notes,
        accentColor: data.accent_color,
      },
    };
  },

  async updateChannel(input: {
    displayName?: string;
    handle?: string;
    notes?: string | null;
    accentColor?: string;
    avatarUrl?: string | null;
    featuredSetId?: string | null;
    coSigns?: CoSign[];
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const patch: Record<string, any> = {};
    if (input.displayName !== undefined) patch.display_name = input.displayName.trim();
    if (input.handle !== undefined) patch.handle = input.handle.trim().toLowerCase();
    if (input.notes !== undefined) patch.notes = input.notes ? input.notes.trim().slice(0, 280) : null;
    if (input.accentColor !== undefined) patch.accent_color = input.accentColor;
    if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
    if (input.featuredSetId !== undefined) patch.featured_set_id = input.featuredSetId;
    if (input.coSigns !== undefined) patch.co_signs = input.coSigns.slice(0, 12);

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return {
      channel: {
        id: data.id,
        handle: data.handle,
        displayName: data.display_name,
        notes: data.notes,
        accentColor: data.accent_color,
        avatarUrl: data.avatar_url,
        featuredSetId: data.featured_set_id,
        coSigns: data.co_signs ?? [],
      },
    };
  },

  async compileSet(input: {
    title: string;
    description?: string;
    coverUrl?: string;
    tracks?: TrackSnapshot[];
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const title = input.title.trim();
    if (!title) throw new Error('Title is required.');

    const tracks = (input.tracks ?? []).map((t) => ({ ...t, addedAt: t.addedAt || Date.now() }));
    const coverUrl = input.coverUrl?.trim() || tracks[0]?.coverUrl || seedCoverFor(title);
    const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);

    const { data, error } = await supabase
      .from('sets')
      .insert({
        owner_id: user.id,
        title,
        description: input.description?.trim() || null,
        cover_url: coverUrl,
        tracks,
        track_count: tracks.length,
        total_duration_ms: totalDurationMs,
        spotify_import_url: null,
      })
      .select()
      .single();

    if (error) throw error;
    return { set: rowToSet(data) };
  },

  async importSpotifyPlaylist(input: { url: string }): Promise<{ set: SetFull }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    // Call the Edge Function to resolve the playlist (needs server-side client secret)
    const { data, error } = await supabase.functions.invoke('spotify-import', {
      body: { url: input.url },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const playlist = data as {
      name: string;
      description: string | null;
      coverUrl: string | null;
      url: string;
      tracks: { title: string; artist: string; albumName: string; coverUrl: string | null }[];
    };

    if (!playlist.tracks.length) throw new Error('Source has no tracks.');

    // Match each Spotify track against iTunes in parallel batches of 10
    const BATCH = 10;
    const matched: TrackSnapshot[] = [];
    const now = Date.now();

    for (let i = 0; i < playlist.tracks.length; i += BATCH) {
      const batch = playlist.tracks.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (t) => {
          const itunes = await lookupTrackByQuery(t.title, t.artist).catch(() => null);
          if (itunes) return { ...itunes, addedAt: now };
          if (!t.title) return null;
          // Keep the track with Spotify metadata even if iTunes has no match
          return {
            itunesTrackId: 0,
            title: t.title,
            artist: t.artist,
            albumName: t.albumName,
            coverUrl: t.coverUrl ?? '',
            previewUrl: null,
            durationMs: 0,
            addedAt: now,
          } as TrackSnapshot;
        }),
      );
      for (const r of results) {
        if (r && (r.itunesTrackId || r.previewUrl)) matched.push(r);
      }
    }

    if (!matched.length) throw new Error('No matching tracks found in the iTunes catalog.');

    const title = playlist.name;
    const coverUrl = playlist.coverUrl ?? seedCoverFor(title);
    const totalDurationMs = matched.reduce((sum, t) => sum + (t.durationMs || 0), 0);

    const { data: setRow, error: setError } = await supabase
      .from('sets')
      .insert({
        owner_id: user.id,
        title,
        description: playlist.description || null,
        cover_url: coverUrl,
        tracks: matched,
        track_count: matched.length,
        total_duration_ms: totalDurationMs,
        spotify_import_url: playlist.url,
      })
      .select()
      .single();

    if (setError) throw setError;
    return { set: rowToSet(setRow) };
  },

  async updateSet(input: {
    setId: string;
    title?: string;
    description?: string | null;
    coverUrl?: string | null;
    tracks?: TrackSnapshot[];
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) throw new Error('Title is required.');
      patch.title = trimmed;
    }
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.coverUrl !== undefined) patch.cover_url = input.coverUrl;
    if (input.tracks !== undefined) {
      patch.tracks = input.tracks;
      patch.track_count = input.tracks.length;
      patch.total_duration_ms = input.tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);
    }

    const { data, error } = await supabase
      .from('sets')
      .update(patch)
      .eq('id', input.setId)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { set: rowToSet(data) };
  },

  async deleteSet(input: { setId: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', input.setId)
      .eq('owner_id', user.id);

    if (error) throw error;
    return { deleted: true };
  },

  async getSet(input: { setId: string }) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: setRow, error: setError } = await supabase
      .from('sets')
      .select('*')
      .eq('id', input.setId)
      .single();

    if (setError || !setRow) throw new Error('Set not found.');

    const { data: ownerRow, error: ownerError } = await supabase
      .from('users')
      .select('id, handle, display_name, accent_color, avatar_url')
      .eq('id', setRow.owner_id)
      .single();

    if (ownerError || !ownerRow) throw new Error('Set owner not found.');

    let viewerHasSubscribed = false;
    if (user && user.id !== ownerRow.id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('subscriber_id')
        .eq('subscriber_id', user.id)
        .eq('channel_id', ownerRow.id)
        .maybeSingle();
      viewerHasSubscribed = !!sub;
    }

    return {
      set: rowToSet(setRow),
      owner: rowToChannelSummary(ownerRow),
      viewerHasSubscribed,
      viewerIsOwner: user?.id === ownerRow.id,
    };
  },

  async fileTrack(input: { setId: string; track: TrackSnapshot }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const { data: setRow, error: setError } = await supabase
      .from('sets')
      .select('*')
      .eq('id', input.setId)
      .eq('owner_id', user.id)
      .single();

    if (setError || !setRow) throw new Error('Set not found.');

    const existing = (setRow.tracks as TrackSnapshot[]).some(
      (t) => t.itunesTrackId === input.track.itunesTrackId,
    );
    if (existing) return { set: rowToSet(setRow), alreadyFiled: true };

    const newTrack = { ...input.track, addedAt: input.track.addedAt || Date.now() };
    const tracks = [...(setRow.tracks as TrackSnapshot[]), newTrack];
    const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);

    const { data: updated, error: updateError } = await supabase
      .from('sets')
      .update({
        tracks,
        track_count: tracks.length,
        total_duration_ms: totalDurationMs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.setId)
      .select()
      .single();

    if (updateError) throw updateError;
    return { set: rowToSet(updated), alreadyFiled: false };
  },

  async getHomeFeed(input: { tab: FeedTab; limit?: number }) {
    const limit = Math.min(input.limit ?? 24, 60);
    const { data: { user } } = await supabase.auth.getUser();

    if (input.tab === 'subscribed' && user) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('subscriber_id', user.id);

      if (subs && subs.length > 0) {
        const channelIds = subs.map((s) => s.channel_id);
        const { data: sets } = await supabase
          .from('sets')
          .select('*, owner:users!owner_id(id, handle, display_name, accent_color, avatar_url)')
          .in('owner_id', channelIds)
          .gt('track_count', 0)
          .order('created_at', { ascending: false })
          .limit(limit);

        return { tab: input.tab, cards: (sets ?? []).map(rowToFeedCard), substituted: false };
      }
      // No subscriptions — fall through to on-rotation
    }

    if (input.tab === 'heavy-rotation') {
      const [{ data: sets }, { data: spins }] = await Promise.all([
        supabase
          .from('sets')
          .select('*, owner:users!owner_id(id, handle, display_name, accent_color, avatar_url)')
          .gt('track_count', 0),
        supabase.from('spins').select('set_id'),
      ]);

      const counts = new Map<string, number>();
      for (const sp of spins ?? []) {
        counts.set(sp.set_id, (counts.get(sp.set_id) ?? 0) + 1);
      }
      const ranked = [...(sets ?? [])].sort((a, b) => {
        const ca = counts.get(a.id) ?? 0;
        const cb = counts.get(b.id) ?? 0;
        if (cb !== ca) return cb - ca;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }).slice(0, limit);

      return { tab: input.tab, cards: ranked.map(rowToFeedCard), substituted: false };
    }

    if (input.tab === 'drift') {
      const { data: sets } = await supabase
        .from('sets')
        .select('*, owner:users!owner_id(id, handle, display_name, accent_color, avatar_url)')
        .gt('track_count', 0);

      const shuffled = [...(sets ?? [])];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { tab: 'drift', cards: shuffled.slice(0, limit).map(rowToFeedCard), substituted: false };
    }

    // on-rotation (and subscribed fallback): trending by recent spins + subscriptions
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: sets }, { data: recentSpins }, { data: recentSubs }] = await Promise.all([
      supabase
        .from('sets')
        .select('*, owner:users!owner_id(id, handle, display_name, accent_color, avatar_url)')
        .gt('track_count', 0),
      supabase.from('spins').select('set_id').gte('created_at', since),
      supabase.from('subscriptions').select('channel_id').gte('created_at', since),
    ]);

    const spinCounts = new Map<string, number>();
    for (const sp of recentSpins ?? []) {
      spinCounts.set(sp.set_id, (spinCounts.get(sp.set_id) ?? 0) + 1);
    }
    const subCounts = new Map<string, number>();
    for (const sub of recentSubs ?? []) {
      subCounts.set(sub.channel_id, (subCounts.get(sub.channel_id) ?? 0) + 1);
    }
    const ranked = [...(sets ?? [])].sort((a, b) => {
      const sa = (spinCounts.get(a.id) ?? 0) + (subCounts.get(a.owner_id) ?? 0);
      const sb = (spinCounts.get(b.id) ?? 0) + (subCounts.get(b.owner_id) ?? 0);
      if (sb !== sa) return sb - sa;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, limit);

    return {
      tab: input.tab,
      cards: ranked.map(rowToFeedCard),
      substituted: input.tab === 'subscribed',
    };
  },

  async getChannel(input: { handle: string }) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('handle', input.handle.toLowerCase())
      .single();

    if (profileError || !profile) throw new Error('Channel not found.');

    const [{ data: sets }, { count: tunedIn }] = await Promise.all([
      supabase
        .from('sets')
        .select('id, title, description, cover_url, track_count, total_duration_ms, created_at')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', profile.id),
    ]);

    let featuredSet: SetFull | null = null;
    if (profile.featured_set_id) {
      const { data: featured } = await supabase
        .from('sets')
        .select('*')
        .eq('id', profile.featured_set_id)
        .single();
      if (featured) featuredSet = rowToSet(featured);
    }

    let viewerHasSubscribed = false;
    if (user && user.id !== profile.id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('subscriber_id')
        .eq('subscriber_id', user.id)
        .eq('channel_id', profile.id)
        .maybeSingle();
      viewerHasSubscribed = !!sub;
    }

    return {
      channel: {
        id: profile.id,
        handle: profile.handle,
        displayName: profile.display_name,
        accentColor: profile.accent_color,
        avatarUrl: profile.avatar_url ?? null,
        notes: profile.notes,
        coSigns: profile.co_signs ?? [],
        featuredSetId: profile.featured_set_id,
        counts: { sets: sets?.length ?? 0, tunedIn: tunedIn ?? 0, tunedTo: 0 },
      } as ChannelFull,
      sets: (sets ?? []).map((s) => ({
        setId: s.id,
        title: s.title,
        description: s.description,
        coverUrl: s.cover_url,
        trackCount: s.track_count,
        totalDurationMs: s.total_duration_ms,
        createdAt: new Date(s.created_at).getTime(),
      })) as ChannelSetSummary[],
      featuredSet,
      viewerHasSubscribed,
      viewerIsOwner: user?.id === profile.id,
    };
  },

  async subscribe(input: { channelId: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');
    if (input.channelId === user.id) throw new Error("You can't subscribe to your own channel.");

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        { subscriber_id: user.id, channel_id: input.channelId },
        { onConflict: 'subscriber_id,channel_id' },
      );

    if (error) throw error;
    return { subscribed: true };
  },

  async unsubscribe(input: { channelId: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('subscriber_id', user.id)
      .eq('channel_id', input.channelId);

    if (error) throw error;
    return { unsubscribed: true };
  },

  async searchAudial(input: { query: string; limit?: number }) {
    const limit = Math.min(input.limit ?? 8, 20);
    const q = input.query.trim();

    if (!q) {
      const [{ data: users }, { data: subs }] = await Promise.all([
        supabase
          .from('users')
          .select('id, handle, display_name, accent_color, avatar_url, notes')
          .not('handle', 'is', null)
          .limit(limit),
        supabase.from('subscriptions').select('channel_id'),
      ]);

      const subCounts = new Map<string, number>();
      for (const s of subs ?? []) {
        subCounts.set(s.channel_id, (subCounts.get(s.channel_id) ?? 0) + 1);
      }
      const channels = [...(users ?? [])]
        .sort((a, b) => (subCounts.get(b.id) ?? 0) - (subCounts.get(a.id) ?? 0))
        .map((u) => ({ channel: rowToChannelSummary(u), notes: u.notes, tunedIn: subCounts.get(u.id) ?? 0 }));

      const tracks = await iTunesSearchTracks('new music friday', 6);
      return { query: '', sets: [], channels, tracks };
    }

    const [{ data: matchedSets }, { data: matchedUsers }] = await Promise.all([
      supabase
        .from('sets')
        .select('id, title, cover_url, track_count, owner_id')
        .ilike('title', `%${q}%`)
        .gt('track_count', 0)
        .limit(limit),
      supabase
        .from('users')
        .select('id, handle, display_name, accent_color, avatar_url, notes')
        .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
        .not('handle', 'is', null)
        .limit(limit),
    ]);

    const ownerIds = [...new Set((matchedSets ?? []).map((s) => s.owner_id))];
    const channelIds = (matchedUsers ?? []).map((u) => u.id);

    const [{ data: owners }, { data: tunedInRows }, tracks] = await Promise.all([
      ownerIds.length
        ? supabase.from('users').select('id, handle, display_name, accent_color, avatar_url').in('id', ownerIds)
        : Promise.resolve({ data: [] as any[] }),
      channelIds.length
        ? supabase.from('subscriptions').select('channel_id').in('channel_id', channelIds)
        : Promise.resolve({ data: [] as any[] }),
      iTunesSearchTracks(q, 8),
    ]);

    const ownerMap = new Map((owners ?? []).map((o) => [o.id, rowToChannelSummary(o)]));
    const tunedInCounts = new Map<string, number>();
    for (const r of tunedInRows ?? []) {
      tunedInCounts.set(r.channel_id, (tunedInCounts.get(r.channel_id) ?? 0) + 1);
    }

    return {
      query: q,
      sets: (matchedSets ?? [])
        .filter((s) => ownerMap.has(s.owner_id))
        .map((s) => ({
          setId: s.id,
          title: s.title,
          coverUrl: s.cover_url,
          trackCount: s.track_count,
          owner: ownerMap.get(s.owner_id)!,
        })),
      channels: (matchedUsers ?? []).map((u) => ({
        channel: rowToChannelSummary(u),
        notes: u.notes,
        tunedIn: tunedInCounts.get(u.id) ?? 0,
      })),
      tracks,
    };
  },

  async searchITunesTracks(input: { query: string; limit?: number }) {
    const tracks = await iTunesSearchTracks(input.query, input.limit);
    return { tracks };
  },

  async searchITunesArtists(input: { query: string; limit?: number }) {
    const artists = await iTunesSearchArtists(input.query, input.limit);
    return { artists };
  },

  async getNextRadioTrack(input: { recentTrackIds?: number[] }) {
    const recent = new Set(input.recentTrackIds ?? []);

    const { data: sets } = await supabase
      .from('sets')
      .select('id, title, owner_id, tracks, owner:users!owner_id(handle, display_name, accent_color)')
      .gt('track_count', 0);

    type PoolEntry = { track: TrackSnapshot; setId: string; setTitle: string; owner: any };
    let pool: PoolEntry[] = [];

    for (const set of sets ?? []) {
      for (const t of (set.tracks as TrackSnapshot[])) {
        if (!t.previewUrl || recent.has(t.itunesTrackId)) continue;
        pool.push({ track: t, setId: set.id, setTitle: set.title, owner: set.owner });
      }
    }

    // If everything was filtered by recents, try again ignoring them
    if (!pool.length) {
      for (const set of sets ?? []) {
        for (const t of (set.tracks as TrackSnapshot[])) {
          if (!t.previewUrl) continue;
          pool.push({ track: t, setId: set.id, setTitle: set.title, owner: set.owner });
        }
      }
    }

    if (!pool.length) return { track: null };

    const pick = pool[Math.floor(Math.random() * pool.length)];
    const owner = Array.isArray(pick.owner) ? pick.owner[0] : pick.owner;

    return {
      track: {
        ...pick.track,
        setId: pick.setId,
        setTitle: pick.setTitle,
        ownerHandle: owner?.handle ?? 'unknown',
        ownerDisplayName: owner?.display_name ?? 'Unknown',
        ownerAccentColor: owner?.accent_color ?? '#DCFF1A',
      } as RadioTrack,
    };
  },

  async logSpin(input: { setId: string; trackItunesId?: number }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { logged: false };

    const { error } = await supabase.from('spins').insert({
      user_id: user.id,
      set_id: input.setId,
      track_itunes_id: input.trackItunesId ?? null,
    });

    if (error) console.error('logSpin error', error);
    return { logged: !error };
  },
};

export default api;
