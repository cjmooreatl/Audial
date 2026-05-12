---
name: Set Embed
description: Drop a set player onto any website or blog — a clean editorial widget that plays the set and links back to the channel.
effort: medium
status: planned
---

A set should be able to live outside Audial. A music blog reviewing a curator's work, a Substack recommending a set, a personal site showcasing what you've been compiling — all of them benefit from an embeddable player that looks like it belongs on the page. The Set Embed is a self-contained widget: cover, title, track list, play controls, and a link back to the full channel. It's also Audial's best ambient growth mechanism.

## What it looks like

- On the set detail page share menu: an `EMBED` option that generates an `<iframe>` snippet. One-click copy to clipboard. Confirmation: `Copied. ▪`
- The embed itself renders as a Bone-on-Ink minimal player widget. Default size: 420px wide × 580px tall (tall variant) or 420×200 (compact). The `width` attribute is adjustable by the embedder.
- Tall variant: cover art (full width, square), then title + curator handle below in Clash Display, then a scrollable track list with play buttons per row. The AUDIAL▪ mark in the bottom-right corner — the exit point.
- Compact variant: 80×80 cover on the left, title + curator + 3-track preview on the right. Play button starts the set from track 1.
- Playback is 30-second previews (or full tracks if the viewer has connected Spotify and is signed into Audial — the embed detects this via a shared auth cookie).
- The AUDIAL▪ wordmark in the embed links to the set detail page. The curator handle links to their channel. Embedders cannot remove these links.

## Key details

- The embed is served from `embed.audial.fm/:setId` — a separate lightweight iframe origin with no nav shell, no auth modal, minimal JS.
- The embed respects the curator's accent color — the play button and active track indicator use the channel's accent, pulled from the set metadata.
- Embeds are always public. Draft sets do not generate a valid embed URL.
- Spin counts from embed plays are logged against the source set — every listen outside Audial still feeds the platform's rotation signals.
- Rate limiting: embed domains are not throttled for reads. If spam or abuse is detected (automated spin inflation), the embed can be disabled per-set by the curator.

~~~
A separate static-ish web interface at `embed.audial.fm` that loads a single `EmbedPlayer` component, fetches the set via `getSet`, and renders without the full app shell. Use the same Zustand audio store pattern but scoped to the iframe. Log spins back to the main backend via the existing `logSpin` method. The `<iframe>` snippet includes `allow="autoplay"` so the player can start on user interaction.
~~~
