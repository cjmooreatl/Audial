---
name: Apple Music Source
description: File tracks from Apple Music alongside Spotify — opening Audial to the 100 million subscribers on the other side of the wall.
effort: large
status: planned
---

Audial is a curation platform, not a Spotify product. But right now, if you live in Apple Music, you can't contribute. Half the music community is locked out of compiling sets because their tracks don't exist in the Spotify catalog. Apple Music source integration makes Audial genuinely platform-agnostic. The curation is the product, not the source.

## What it looks like

- Searching for tracks in the Compile a Set modal shows results from both sources simultaneously, de-duplicated by artist + title matching. Each track row shows a small source indicator: `SPOTIFY` or `APPLE` in Mono-Meta.
- The Wire draws from both sources' tracks. 30-second previews are available from Apple Music's catalog natively.
- On a set detail page, tracks from different sources coexist in the track list. The source label appears on each row.
- Apple Music subscribers who connect their account (via MusicKit JS) get full playback on Apple Music tracks, exactly as Spotify Premium subscribers do for Spotify tracks.
- A channel can feature a set with mixed-source tracks. The Wire plays both.

## Key details

- Track identity: a track is now `{ sourceType: 'spotify' | 'apple', sourceTrackId, title, artist, albumName, coverUrl, previewUrl, durationMs }`. The compound key `(sourceType, sourceTrackId)` is the canonical identifier.
- Apple Music catalog search uses the MusicKit JS API (client-side) and the Apple Music API (server-side for preview URL resolution). Apple MusicKit developer token required as a platform secret.
- Preview URLs for Apple Music tracks are available without user authentication via the Apple Music catalog API.
- Full playback requires the user to authenticate with Apple Music via MusicKit JS — same opt-in pattern as Spotify Connect.
- De-duplication across sources: when both a Spotify and Apple Music version of the same track exist, show the version matching the user's connected account first. No auto-merge — they remain distinct track objects.
- The Wire needs a source-agnostic audio layer: abstract the current Spotify-specific audio path behind a `TrackPlayer` interface with Spotify and Apple implementations.

~~~
New `sourceType` field on the track JSON stored in sets. Update `searchTracks` to call both Spotify and Apple Music catalog APIs in parallel, merge results by title+artist, sort by relevance. Add `appleDevToken` as a platform secret. Client-side MusicKit JS initialization for Apple Music playback and user auth. The existing `AudioController` needs a source adapter abstraction — `SpotifyAdapter` and `AppleMusicAdapter` implementing a common `play(trackId)` / `pause()` / `seek(ms)` interface.
~~~
