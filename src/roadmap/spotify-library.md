---
name: Import from Your Library
description: Browse your own Spotify playlists by name and compile them into Audial sets — no URL hunting, no copy-paste.
effort: small
status: planned
---

Sharing a set today means digging up a Spotify playlist URL, pasting it into the Share a Set modal, and waiting for it to resolve. That's friction between intent and action. With a connected Spotify account, the modal becomes a browser: your playlists by name, right there. Pick one, compile it. Each track is matched to the iTunes catalog for previews. Done.

## What it looks like

- When a user with a connected Spotify account opens `SHARE A SET`, the modal offers two modes toggled at the top — `PASTE URL` (the current flow, unchanged) and `YOUR LIBRARY` (new).
- In `YOUR LIBRARY` mode: a scrollable list of the user's Spotify playlists, each row showing cover (32×32), playlist name (Subhead), and track count (Mono-Meta). Searchable with a quick inline filter input above the list.
- Tap a playlist — it highlights with a 2px accent inset. The `SHARE` button activates.
- On confirm: Audial fetches the Spotify playlist's tracks, then matches each one against the iTunes Search API (by title + artist). Matched tracks snapshot into the new Audial set with iTunes metadata. Unmatched tracks are skipped with a small `[N] cuts not found in catalog` note shown after import.

## Key details

- Requires Spotify connected (see: Connect Your Spotify). If no account connected, `YOUR LIBRARY` tab is visible but shows `Connect Spotify to browse your playlists.` with a direct link to connect.
- Pulls from `GET /me/playlists` — up to 50 most recent. `LOAD MORE` mono link if the user has more.
- Private and collaborative playlists included (user is authenticated as themselves).
- Track matching uses iTunes Search API `term={title} {artist}&entity=song` — first confident result wins. Match confidence is determined by normalized title + artist comparison. Fuzzy-matched tracks are flagged for user review with a `REVIEW UNMATCHED` collapse at the bottom of the new set.
- The resulting Audial set is a snapshot. Changes to the source Spotify playlist don't propagate.
- iTunes match rate won't be 100% for niche or regional catalog — that's acceptable. The feature still saves significant friction for the majority of tracks.

~~~
Use the user's `spotifyAccessToken` to call `GET https://api.spotify.com/v1/me/playlists`, then `GET /playlists/{id}/tracks` for the selected playlist. For each Spotify track, call the iTunes Search API to resolve to an iTunes track entity. Reuse the existing set-compilation logic (same track shape). Run matches in parallel batches of 10 to avoid rate limits. The `importFromSpotifyLibrary(spotifyPlaylistId)` backend method handles the full flow and returns the new set ID plus an array of unmatched track names.
~~~
