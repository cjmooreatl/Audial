---
name: Audial
description: A community-first music app where curators compile and share sets backed by real catalog tracks.
---

# Audial

Audial is a community for people who care more about the playlist than the platform. Members compile **sets** (playlists) from real tracks, broadcast them on their **channel** (profile), discover other curators through a feed and a constant on-page radio, and build a shared culture around taste.

The platform sits next to the major streaming services, not in front of it. Track metadata, artwork, and audio previews come from Apple's iTunes Search API; the social fabric, the curation, the editorial framing all live inside Audial.

~~~
The voice and terminology of this app departs from generic product language by design. See `src/interfaces/@brand/voice.md` for the full rename map. Throughout this spec, the Audial term is used (Set, Channel, Subscribe, etc.) — the underlying concepts map to standard product nouns (playlist, profile, follow). The terminology is part of the product, not decoration; the same renames flow through the UI, microcopy, error messages, and method names where they appear in user-facing strings.
~~~

## Members

Anyone can browse Audial without signing up. Browsing the home feed, exploring channels, listening to The Wire on the search page, and viewing any set are all public. Audial is an editorial space and the curation should be visible to non-members so they want to join.

Signing up is required only at the moment of intent — when someone wants to [compile a set]{Create their first set/playlist.}, [file a track]{Save a track from The Wire to a set.}, [subscribe to a channel]{Follow another user.}, or [open their own channel]{Visit /profile to customize their own profile.}. The auth wall is reactive, not preemptive.

~~~
Auth is enabled with email code only. SMS is on the roadmap but not in MVP — keeping signup friction minimal.

For MVP every signed-up user has the same capabilities. No roles. The `roles` column exists on the user table for future use (curator features, moderation), but no role checks gate behavior in MVP.

The user record (the auth table) holds both the platform-managed columns (email, roles) and Audial-specific channel data: handle, display name, notes/bio, accent color, featured set, co-signed artists, avatar. Treat the user record as the channel — there is no separate channel/profile table.
~~~

### Channel data on each member

Every member has a [channel]{User profile, called a channel throughout the product.} that's customizable. The shape of a channel:

- A unique [handle]{Lowercase, alphanumeric + dot/underscore, 3-20 chars. Used in URLs (`/c/handle`) and shown as `@handle` next to display name. Handle is set during onboarding and editable later.}
- A display name (free-form, can include spaces, emoji, etc.)
- [Notes]{Bio. Free-form text, max ~280 chars. Placeholder copy: "Your channel. What's on rotation, what's broadcasting, who you ride for."}
- An [accent color]{User's chosen accent. Stored as a hex string. Defaults to the brand Signal chartreuse for new accounts. Validated on save: must pass the brand guardrails (luminosity ≤ 0.85 OKLCH, ≥ 8° hue away from Heat #FF3B2E). The picker offers ~18 curated swatches plus a custom hex input — see `web.md`.}
- A [featured set]{The set that auto-plays on the channel. Optional — when null, the channel still works but the masthead has no Now Playing area. References a set the user has compiled or filed.}
- A list of [co-signs]{User-curated list of favorite artists. Stored as an array of objects: `{ itunesArtistId, name, imageUrl }`. Up to ~12. Surfaced as a horizontal strip on the channel page.}
- An [avatar]{Optional uploaded image. Square. Defaults to a generated geometric mark in the user's accent color when not set. Stored as a CDN URL.}

The accent color is a major payoff moment in the product — when set, it propagates through the entire profile (section underlines, the File to Set button color, the On Air indicator on the featured set's hero), instantly. See `visual.md` for the live-preview pattern.

## Sets

A [set]{Playlist.} is the core content object on Audial. Sets are owned by one member and have:

- A title (required, free-form)
- An optional description
- A [cover]{Square cover art. Either uploaded by the user, generated from the brand seed image library on creation, or auto-derived from the first track's album art. See `web.md` "Compile a set" flow.}
- An ordered list of [tracks]{Stored as a JSON array on the set row. Each track entry: `{ itunesTrackId, title, artist, albumName, coverUrl, previewUrl, durationMs, addedAt }`. We denormalize iTunes track metadata onto the set so cover art and titles render without an external API round-trip on every read. The iTunes track ID is the canonical reference; metadata is a snapshot at file-time.}
- Computed metadata: [total cuts and duration]{Cut count = `tracks.length`. Total duration = sum of `durationMs`. Recompute on every track edit, store on the set row so feed cards don't recompute on every render.}
- Visibility — for MVP every set is **public**. Private sets are roadmap.

Sets are created in two ways:

1. [**Compile a set**]{Create flow. User opens the create modal from the `+` action, sets a title, then searches iTunes tracks and adds them to the set. They can save with zero tracks (an empty set is valid — they can fill it over time).} — build from scratch by searching tracks
2. [**Share a set**]{Import flow. For MVP this is "paste a Spotify playlist URL" only — we resolve the playlist via Spotify's API (Client Credentials) and ingest its tracks into a new Audial set owned by the importing user, looking each track up on iTunes for a preview URL. The Audial set is a snapshot; it does not stay synced with the source Spotify playlist. Future roadmap: Apple Music URL import, connect Spotify account and pick from your own playlists in a list UI.} — import an existing Spotify playlist

Both paths produce the same kind of object: a set owned by the current user. There is no concept of "shared by someone else" — when you import, you own the resulting Audial set, and the act is recorded as a "share" event for attribution if useful. For MVP we don't surface attribution; the original Spotify playlist URL is stored on the set row but not displayed.

~~~
On import, parse the Spotify playlist URL or URI to extract the playlist ID, call Spotify's `/playlists/{id}/tracks` (Client Credentials, app-level token, no user OAuth needed for public playlists). For each track, snapshot the relevant fields onto the new set's tracks array AND query iTunes Search to find a `previewUrl` for it. The Audial cover art defaults to the source playlist's cover, which the user can replace.

Use the `mindstudio.httpRequest` action with the Spotify Bearer token for these calls. The Spotify helper handles auth — see "Music data integration" below.
~~~

### Editing a set

Owners can rename, edit description, change cover, reorder tracks, remove tracks, and delete the set entirely. Non-owners can only view and file tracks from it.

When a user files a track from The Wire or from a search result, they pick which of their own sets to file it into (or compile a new one inline). The track gets appended to the chosen set's tracks array.

## The social fabric

### Subscriptions

A [subscription]{Follow relationship. Member A subscribes to Member B's channel; A is the subscriber, B is the channel. Stored in a join table with subscriber ID, channel ID, timestamp.} is the directional follow. No mutuality required. Subscriptions drive the home feed's `Subscribed` tab (sets compiled by channels you subscribe to) and the `Tuned in` count on a channel.

Members can subscribe and unsubscribe from a channel at any time from the channel page or any set card.

~~~
Unique constraint on `(subscriberId, channelId)` — a member can only subscribe to a channel once. Self-subscription is blocked (you can't subscribe to your own channel).
~~~

### Spins

Every time a member plays a set or files a track, we log a [spin]{Play event. Stored in a spins table: who played, what set (or track), when. Used to compute Heavy Rotation tab and analytics like "spins" count.}. Spins are anonymous from a privacy perspective — we don't surface "X listened to Y" publicly in MVP — but they power discovery surfaces.

A spin is logged when:
- A preview from a set actually starts playing (not just a hover/preload)
- The Wire advances to a new track during active listening (the track gets a spin against its source set)

We don't double-count rapid skip-throughs. A spin only counts after [a track has played for at least 5 seconds]{Implement with a setTimeout in the player; if the track is paused/skipped before 5s elapses, no spin is logged. This avoids inflated counts from accidental autoplay or fast scrolling.}.

## The home feed

The home page is a [magazine-style feed]{Asymmetric layout, mixed scales — see `web.md` for layout details. Not a uniform card grid.} with four tabs across the top:

1. [`01 / SUBSCRIBED`]{Sets compiled by channels the current user subscribes to, newest first. Empty state when the user subscribes to nobody yet — show a fallback recommending high-engagement curators. Anonymous users see a default mix as if subscribed to a starter set of channels.}
2. [`02 / ON ROTATION`]{Trending sets. For MVP: sets ranked by spin count + new subscriber count to the owner's channel within the last 7 days, weighted equally. Use a simple computed score, refresh on read (cheap at this scale). Tie-break by recency.}
3. [`03 / HEAVY ROTATION`]{Top listened. Sets ranked by all-time spins, descending. Independent of recency. Tie-break by subscribe count to owner.}
4. [`04 / DRIFT`]{Random. Random sample of sets across the platform, refreshes on every visit and via a "drift again" interaction. Excludes sets with zero tracks.}

Each tab returns a list of sets (with owner channel info and computed counts denormalized) that the frontend renders as feed cards. See `web.md` for card variants and layout treatment.

~~~
For Subscribed tab on signed-out users: instead of an empty state, return the same query as On Rotation. Most users won't notice; those who do should see compelling content and be motivated to sign up. We'll mark the tab indicator with a small "preview" mono label when the user is anonymous to be honest about it.
~~~

## The search page

Two things happen on the search page:

1. **Search** — a single input searches across **sets** (by title), **channels** (by handle and display name), and **tracks** (via iTunes Search API). Results group into three lanes shown in mono-numbered editorial sections. Empty state shows trending search suggestions or featured curators.

2. [**The Wire**]{Audial's always-on radio. A 30-second preview plays continuously, advancing automatically. The Wire panel sits prominently on the search page (right column on desktop, below search on mobile) and shows the current track's cover, title, artist, source set, and a File to Set CTA. Track ends → next track loads automatically. Pause/play available but the default is play-on-arrival (subject to browser autoplay policy — see `web.md` "audio behavior" notes).}

The Wire pulls from a [pool of tracks]{For MVP: the union of all tracks across all sets on the platform that have a non-null preview URL. Pick uniformly at random with a no-immediate-repeat rule (don't replay the last 10 tracks). When the platform is small, this might cycle quickly, which is fine — early users discover more sets that way.} that lives within the platform — every track playing on The Wire comes from someone's compiled set, which means listening to The Wire is also browsing the community's collective taste.

Filing a track from The Wire opens a small inline picker: list of the user's own sets, with a "Compile new set" option at the top. Pick a set → track gets filed → the picker collapses → the radio keeps playing. No interruption, no toast, just a "FILED" mono label that flashes near the bar for 1.4s.

~~~
The Wire is a critical UX moment. Implementation notes:

- Audio plays through a single global audio context (we don't want multiple players overlapping). Entering a profile that auto-plays the featured set pauses The Wire; leaving the profile resumes The Wire.
- Track advancement uses the audio element's `ended` event to call `getNextRadioTrack`. Pre-fetch the next track's preview URL while the current is playing so there's no gap.
- Browser autoplay policy will block initial playback before user interaction. Show a "TAP TO TUNE IN" overlay over the Wire panel until first interaction. Don't use a permission-style modal.
- "File to Set" picker is inline within the Wire panel, not a modal. Keep the listening flow uninterrupted.
- See `visual.md` for the persistent now-playing bar at the bottom that mirrors The Wire's current track when active.
~~~

## Music data integration

Audial uses two music data sources: **iTunes Search API** as the primary source for search and audio previews (no auth, public, fast), and **Spotify Web API** as a secondary source used only for the optional "Share a Set" import flow.

### iTunes Search API — primary (no auth, no secrets)
The [iTunes Search API]{Public endpoint at `https://itunes.apple.com/search`. No authentication. Returns track results with title, artist, album, artwork URL (artwork URLs need transforming — the API returns 100x100 thumbnails; we substitute `/100x100bb.jpg` for `/600x600bb.jpg` in the URL to get a high-res cover), 30-second `previewUrl` (m4a, plays in browser without auth), and `trackTimeMillis` for duration. Sufficient for: track search (powers Compile a Set + the Cuts lane in search), artist search (for co-signs), the entire Wire pool, all preview audio in the app.} powers nearly every music data interaction in the app. Anyone can use Audial without any external credentials configured — search, compile sets, listen to The Wire, and customize their channel all work end-to-end against iTunes.

We chose iTunes after discovering that [Spotify removed `preview_url` from their Web API in November 2024]{This means Spotify track responses now return `null` for the preview URL on essentially all tracks. iTunes is the most reliable cross-catalog source for 30-second previews available without per-user OAuth.}. Apple's catalog largely overlaps Spotify's, so the user-facing experience is the same.

To make sure search returns broad, [streamable]{A track is "streamable" in Audial when its `previewUrl` is non-null — meaning the iTunes Search API has a 30-second sample we can play in the browser without auth. We never surface a track in search results that can't be played, since the user can't do anything useful with it.} catalog coverage, `searchTracks` queries [multiple iTunes storefronts in parallel]{Storefronts queried: US, GB, JP, DE, BR. The US storefront has the deepest catalog overall, but licensing gaps mean many tracks (UK indie, J-pop, K-pop, Latin, anime soundtracks, German artists, Brazilian artists, etc.) only exist in regional stores. Querying a small set of representative regions in parallel widens coverage substantially with one extra round of fetches. Failures from any individual storefront are tolerated via `Promise.allSettled` — surviving storefronts still return results.} and merges the results. Duplicates across storefronts are collapsed by lowercased title+artist; if one storefront has a streamable copy and another doesn't, we prefer the streamable one. The final result is filtered to only tracks with a `previewUrl`, so search hits are guaranteed to play.

~~~
The iTunes helper lives at `dist/methods/src/common/itunes.ts` and exposes:
- `searchTracks(term, limit)` — runs parallel searches against US/GB/JP/DE/BR storefronts via `Promise.allSettled`, merges results, dedupes by lowercased `title + artist` key (preferring entries with a `previewUrl`), filters to streamable-only, returns normalized TrackSnapshot[] with `previewUrl`, high-res cover URL, and full metadata. Each storefront is over-fetched (~2x the requested limit) so the streamable filter has enough to choose from.
- `searchArtists(term, limit)` — calls `entity=musicArtist`. Note iTunes' artist search returns less metadata than Spotify's; we get artist name + iTunes artist ID. For artist images we do a follow-up song lookup to grab `artworkUrl100` from the artist's most popular track and use that as the avatar (good enough for co-signs).
- `lookupTrackByQuery(title, artist)` — used by the Spotify import flow to find iTunes preview URLs for tracks the Spotify API returned.

No rate limit signing required. Multi-storefront search adds roughly 500-800ms vs single-storefront in practice (5 parallel fetches bottlenecked by the slowest one).
~~~
### Spotify Web API — optional, for playlist import only

The **Share a Set** flow lets users paste a Spotify playlist URL to import its tracks. This requires Spotify [Client Credentials]{Backend exchanges client ID + client secret for an app-level access token. Token cached in module-scoped memory with refresh-before-expiry. No user OAuth involved.}. When `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are configured, the import flow:

1. Parses the Spotify playlist URL or URI for the playlist ID
2. Calls Spotify's `/playlists/{id}/tracks` to get track metadata (title, artist, album, cover)
3. For each track, queries iTunes Search to find a matching `previewUrl`
4. Snapshots all the metadata onto a new Audial set

When Spotify credentials aren't configured, the Share a Set modal surfaces a clear inline error pointing the user at the secrets management dashboard. The rest of Audial keeps working untouched.

~~~
The Spotify helper lives at `dist/methods/src/common/spotify.ts`:
- `getAccessToken()` — returns a cached token, refreshing if expiring within 60s. Throws a descriptive error with code `spotify_not_configured` if either env var is missing.
- `resolvePlaylist(urlOrId)` — returns full playlist details (name, cover, tracks). Throws `spotify_playlist_not_found` for 404s, `spotify_playlist_private` for 403s.

The `importSpotifyPlaylist` method composes these helpers with `itunes.lookupTrackByQuery` to fill in preview URLs.
~~~

### Audio previews

Every TrackSnapshot in the app stores a [`previewUrl`]{30-second m4a/mp3 URL from iTunes Search. Plays in browser via standard `<audio>` element with no auth. Some obscure tracks won't have an iTunes match (no preview); those are still valid set entries but render with a small "NO PREVIEW" badge and don't appear in The Wire pool.}, which is what The Wire and all in-page previews use. We snapshot this URL at file-time so it's stable for the life of that set entry.

### What each source provides

| iTunes Search | Spotify Web API |
|---|---|
| Track search (the Cuts lane in search) | Playlist resolution (Share a Set import only) |
| 30-second previews | (no audio — deprecated) |
| Cover art for tracks and albums | Cover art for imported playlists |
| Artist search (for co-signs) | — |
| Compile a Set track picker | — |

Roadmap: connecting a personal Spotify account unlocks importing your own playlists by name, populating "recently listened" on your channel, and full-track playback for Premium subscribers via the Spotify Web Playback SDK. Apple Music and YouTube Music integrations are also on the roadmap.

## Backend methods

All backend logic lives in methods. The full set:

### Auth and onboarding
- [`getCurrentChannel`]{Returns the current user's channel data (themselves) for the frontend to render personalized UI. Returns `null` for anonymous users — never throws on missing auth. Includes counts: cuts compiled, channels subscribed, tuned-in count (people subscribed to them).}
- [`completeOnboarding`]{Called after first email verification. Takes a handle, displayName, optional bio, optional accentColor. Validates handle uniqueness (case-insensitive) and format. Sets up the channel. If the handle is taken, returns the validation error; the frontend re-prompts inline.}
- [`updateChannel`]{Owner-only. Updates display name, notes, accent color, avatar URL, featured set, co-signs. Validates accent color against brand guardrails on save.}

### Sets
- [`compileSet`]{Create a set. Inputs: title, description?, coverUrl?, initial tracks?. Returns the new set with full metadata. Cover defaults to the first track's album art if not provided, or to a deterministic seed cover from the brand library if no tracks.}
- [`importSpotifyPlaylist`]{Inputs: a Spotify playlist URL or ID. Resolves via Spotify Client Credentials, looks each track up on iTunes for previews, creates a new Audial set owned by the caller. Returns the new set. If Spotify isn't configured or the playlist is private/missing, returns a clear error string.}
- [`updateSet`]{Owner-only. Title, description, cover, track reorder/removal/add. Recomputes derived counts on save.}
- [`deleteSet`]{Owner-only. Cascades: removes the set, removes any spin entries referencing it. If any user has this as their featured set, clears their featured set field.}
- [`getSet`]{Public. Returns full set with owner channel summary and a "viewerHasSubscribed" boolean if signed in.}
- [`fileTrack`]{Append a track to a set the caller owns. Inputs: setId, track snapshot. Idempotent if the track already exists in the set (no-op, returns success). Recompute derived counts.}

### Feed
- [`getHomeFeed`]{Inputs: tab (`subscribed | on-rotation | heavy-rotation | drift`), limit, cursor. Returns sets with owner summary. See annotations on each tab above for ranking logic. Cursors for pagination. Drift returns randomized non-overlapping batches per cursor.}
- [`getChannel`]{Public. Inputs: handle. Returns the channel, their compiled sets (recent first), tuned-in count, viewer's subscribe state, and recently spun sets if the channel owner has any. Embeds featured set and co-signs.}

### Subscriptions
- [`subscribe`]{Auth required. Inputs: channelId. Idempotent. Self-subscription blocked.}
- [`unsubscribe`]{Auth required. Inputs: channelId. Idempotent.}

### Search and the Wire
- [`searchAudial`]{Inputs: query, limit per lane. Returns three lanes: matching sets (by title), matching channels (by handle/display name), matching tracks (via iTunes Search). Empty query returns featured curators and a curated set of trending tracks.}
- [`searchITunesTracks`]{Used inside the Compile a set flow. Inputs: query. Returns iTunes track results normalized to TrackSnapshot shape.}
- [`searchITunesArtists`]{Used inside the Edit Channel modal for adding co-signs. Inputs: query. Returns artist results with iTunes artist ID, name, and an image URL.}
- [`getNextRadioTrack`]{Inputs: recentTrackIds (the last 10 tracks the client played). Returns one track with full snapshot data plus the source set's id, title, owner handle. Picked at random with the no-immediate-repeat rule.}

### Spins
- [`logSpin`]{Auth required. Inputs: setId, trackItunesId?. Logs a spin event. Cheap insert. Throttled per (user, set, track) per minute on the client side. Anonymous users don't log spins.}

~~~
Most reads are public, most writes are auth-gated. Use `auth.userId` checks (not `auth.requireRole`) since there are no roles in MVP.

For methods that have different behavior signed-in vs. anonymous (e.g., `getHomeFeed` with the `subscribed` tab), check `auth.userId` and branch.

Throttling on `logSpin` is client-side only for MVP.
~~~

## Tables

The database has these tables:

- [`users`]{Auth table. Columns include: email (auth-managed), roles (auth-managed, unused in MVP), handle (unique), displayName, notes (bio), accentColor (hex string), featuredSetId (nullable, references sets.id), coSigns (JSON array), avatarUrl. All Audial-specific fields are optional — type them as nullable since the auth row is created on first verification before onboarding completes.}
- [`sets`]{Owner-foreign-keyed to users. Columns: ownerId (User), title, description (nullable), coverUrl (nullable, falls back to first track's album art on render), tracks (JSON array of track snapshots), trackCount (computed, denormalized), totalDurationMs (computed, denormalized), spotifyImportUrl (nullable, used for set provenance when imported).}
- [`subscriptions`]{Join table. subscriberId (User), channelId (User), unique constraint on the pair.}
- [`spins`]{Event log. userId (User), setId, trackItunesId (nullable). `created_at` is the playedAt time.}

~~~
Table names: `users`, `sets`, `subscriptions`, `spins`. Snake-case, no hyphens, valid identifier characters only.

Unique constraints:
- users: `[['handle']]` (case-insensitive uniqueness enforced in `completeOnboarding` by lowercasing before query)
- subscriptions: `[['subscriberId', 'channelId']]`

Defaults:
- users.accentColor: `'#DCFF1A'` (Signal chartreuse)
- users.coSigns: `[]`

For sets.tracks, type as a typed array of track entries:
```typescript
interface TrackSnapshot {
  itunesTrackId: number;
  title: string;
  artist: string;
  albumName: string;
  coverUrl: string;
  previewUrl: string | null;
  durationMs: number;
  addedAt: number; // unix ms
}
```
Stored as JSON, parsed transparently by the SDK.

System columns (id, created_at, updated_at, last_updated_by) are automatic — don't declare them on the interfaces.
~~~

## Scenarios

Three scenarios cover the testing matrix. All three drop sample data using the seed cover images from the brand library and real iTunes track data fetched at scenario run time.

- [`empty-debut`]{A brand new user, just signed up, no sets, no subscriptions. Test user lands as themselves with empty everything. Around them, ~6 other curators with realistic populated channels exist on the platform so the home feed isn't empty. Test user's roles: `[]`. Test user's email is the dev bypass (`remy@mindstudio.ai`).}
- [`populated-platform`]{The lived-in default. ~10 distinct curator channels with handles like `moss.fm`, `kestrel`, `lowlit`, `static.bureau`, `concrete.hours`, etc. Each has a populated channel: display name, notes, accent color (varied across the brand-safe palette), 1-3 compiled sets, a featured set picked, 3-8 co-signed artists. ~24 total sets across the platform with realistic titles ("Concrete Hours", "Dub Architecture", "Saturday 4AM", "Whispers", "Crate Diggers", "Static", "Last Train Home", etc.), each with 8-15 tracks pulled from popular iTunes catalog tracks at scenario seed time. Subscriptions: a realistic graph (each curator subscribes to 2-4 others, no fully-connected graph). Spins: a few hundred spin events scattered across recent days to populate Heavy Rotation and On Rotation tabs realistically. Test user is one of these curators — `moss.fm` — with their own sets and subscriptions, so they have a real perspective on the platform when they sign in. This is the default scenario for first-time editor experience.}
- [`solo-curator`]{A single curator with a fully-built channel — sets, co-signs, featured set, customized accent — but a sparse social network around them (1-2 subscribers, no one they subscribe to). Tests the channel-from-the-owner perspective and the empty Subscribed feed for an established user.}

~~~
Scenarios live in `dist/methods/.scenarios/`. Each is an async function that uses the same `db.push()` API as methods. The seed track data is fetched from iTunes Search at scenario seed time using a curated list of search queries (artist + track) that produce known-good results. Cache the results during a single scenario run to avoid re-querying for the same track.

Cover art assignments per the brand library:
- /cover-crowd → "Concrete Hours", "Basement Years"
- /cover-riso → "Static", "Warmer Months"
- /cover-brutalist → "Dub Architecture", "Civic"
- /cover-laser → "Saturday 4AM", "Strobe"
- /cover-vinyl → "Crate Diggers", "Back Catalogue"
- /cover-silhouette → "Whispers", "Last Train Home"

Image URLs are stored at the canonical i.mscdn.ai URLs from `@brand/visual.md`.

Default scenario for first-time experience: `populated-platform`. The test user lands as `moss.fm` and immediately sees a real platform.
~~~
