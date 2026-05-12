---
name: Connect Your Spotify
description: Link your Spotify account to Audial — unlocking full track playback for Premium subscribers and your personal listening history on your channel.
effort: medium
status: planned
---

Audial uses the iTunes Search API for track metadata and previews — no user auth required, stable 30-second MP3s. But iTunes previews are samplers, not songs. Connecting a Spotify account changes that for Premium subscribers: tracks play in full via the Spotify Web Playback SDK. The platform stays iTunes-native for catalog and search; Spotify Connect is the premium playback layer, layered on top.

## What it looks like

- A `CONNECT SPOTIFY` affordance in the Edit Channel modal and in account settings.
- OAuth flow opens in a new tab, completes, returns. The channel shows a small `SPOTIFY CONNECTED` mono indicator.
- For Premium subscribers: tracks in sets and The Wire play in full, not just 30 seconds. Audial registers as a Spotify Connect device — the track plays from within the app, no redirect to Spotify. The On Air bar shows a full runtime progress bar.
- For free Spotify accounts: no full playback, but the connection still grants personal library access (see: Import from Your Library) and listening history display on the channel.
- Anonymous and unconnected users continue to experience the product exactly as in MVP — 30-second iTunes previews throughout.

## Key details

- Spotify OAuth scopes required: `user-read-playback-state`, `user-modify-playback-state`, `user-read-recently-played`, `user-library-read`, `playlist-read-private`, `streaming`.
- Full playback uses the Spotify Web Playback SDK — Audial becomes a Spotify Connect device. Track identity bridge: when a user with Spotify connected plays a track, the system matches the iTunes track (by title + artist) to a Spotify track ID for SDK playback. Match confidence is stored; if no confident match is found, fall back to iTunes 30s preview.
- The Wire and set players check for Premium status before using full playback; fall back to iTunes previews seamlessly for free accounts.
- Access token stored encrypted per user, refresh token handled server-side. Token refresh is transparent.
- If a user disconnects Spotify, the platform reverts to preview-only with no data loss.

~~~
Spotify OAuth via Authorization Code Flow with PKCE. Store `spotifyAccessToken`, `spotifyRefreshToken`, `spotifyTokenExpiry`, `spotifyUserId`, and `spotifyIsPremium` on the user record. The Spotify Web Playback SDK is loaded client-side only when `spotifyIsPremium === true`. Title+artist matching to Spotify track IDs can be done via Spotify's search API at play-time and cached per iTunes track ID. The AudioController's source adapter (introduced with this feature) checks the current user's Premium status and routes to Spotify SDK or iTunes preview accordingly.
~~~
