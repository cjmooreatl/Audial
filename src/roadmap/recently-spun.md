---
name: Recently Spun
description: A live strip on your channel showing what you've been listening to — your real listening history as part of your curation identity.
effort: medium
status: planned
---

A channel is a statement of taste. Right now it shows what you've compiled. This adds what you've been spinning — recent tracks pulled from your connected Spotify, displayed as a horizontal strip on your channel. It turns a channel from a portfolio into a broadcast in progress.

## What it looks like

- A new section on the channel page below Co-signs: `05 / RECENTLY SPUN`.
- A horizontal scroll strip of track tiles — 64×64 album art, track title below in UI weight 500 (2-line clamp), artist in Mono-Meta. Up to 10 most recent.
- Each tile is hoverable: shows a small `▶ PREVIEW` badge over the cover. Click plays the 30s preview through the On Air bar.
- On your own channel, a small `SPOTIFY CONNECTED` indicator appears at the right edge of the section header. If Spotify isn't connected, the section is hidden entirely.
- On other channels: visible only if that user has connected Spotify and chosen to display it (opt-in setting in Edit Channel).

## Key details

- Data comes from Spotify's `GET /me/player/recently-played` — up to the last 50 tracks, filtered to the most recent 10 unique tracks (no immediate repeats).
- Refreshed on channel load (not cached aggressively — the point is it's current).
- Privacy-first: off by default, opt-in in Edit Channel. "Show recently spun on my channel." — a single toggle.
- Tracks shown may or may not be in any Audial set. That's fine and intentional — it reveals listening beyond curation.
- If a viewer sees a track they want to file, the standard file-to-set interaction is available per tile.

~~~
Add `showRecentlySpun: boolean` to the user record (default false). On `getChannel`, if `showRecentlySpun` is true and the user has a valid `spotifyAccessToken`, call Spotify's recently-played endpoint server-side and include the results in the channel response payload. Cache for 5 minutes per user to avoid hammering the Spotify API on every profile view.
~~~
