---
name: Audial — First Transmission
description: The full three-page platform — home feed, channels, The Wire, set compilation, and a curated community built on real iTunes tracks with playable previews.
effort: large
status: done
---

Audial's first transmission. Everything that makes the product what it is, live in one build: the magazine feed, the channel as a broadcast station, the Wire as a constant radio, and all the editorial identity that makes it feel like a publication and not an app.

## What it looks like

**Home** — Four-tab magazine feed (Subscribed, On Rotation, Heavy Rotation, Drift). Asymmetric card layout: hero cards, compact grids, editorial row dividers. A daily-rotating masthead headline. The `+` to compile or share a set from anywhere. Animated tab indicator slides between active tabs.

**Channel** — A curator's personal broadcast station. Accent color propagates everywhere via a CSS variable swap on page entry. Choreographed stagger: accent sweep bar → avatar + masthead → Now Playing hero → sections. Featured set has a mute toggle for the owner. Selections, Co-signs, and full compiled sets below. Edit Channel modal for handle, bio, color, and pinned content.

**Search + The Wire** — A two-column page: search across sets, channels, and cuts on the left; The Wire panel running live on the right. File any track to any set without stopping the radio.

**Auth** — Reactive, never preemptive. Email code only. Channel setup inline on first sign-in.

**On Air bar** — Persistent at the bottom across all pages when audio is active. Marquee scrolling the set title and curator handle. Cover art thumbnail with a punch animation (0.96 scale, 200ms) on file. `FILED ▪` chip overlays the cover for 1.4s on file. Skip-forward icon advances The Wire to the next track. File-to-set inline picker expands from the bar.

## Key details

- Public browsing on all three pages — no auth wall until intent.
- Track data and previews from the iTunes Search API (pivoted from Spotify after the November 2024 Spotify preview URL deprecation). 30-second preview URLs remain stable.
- The Wire draws from all platform tracks with a non-null preview URL, no-repeat last 10.
- Spins logged after 5 seconds of playback. Power the On Rotation and Heavy Rotation tabs.
- Accent color picker: 18 curated presets + custom hex, validated against luminosity and Heat-hue guardrails. Live preview on the modal as the user picks.
- Broadcast-coded voice throughout: Set, Channel, Tune in, File to set, On Rotation, Spins, Tuned in — every string passes the brand test.
- Bone + Ink + Signal (chartreuse) aesthetic throughout. Signal yields to the channel owner's accent on their own page.
- Populated-platform scenario seeded by default: 10 curators with compiled sets and filled channels, so the first user lands on a credible, inhabited feed rather than an empty state.

~~~
Full-stack Vite + React frontend. Zustand for global audio store (Wire, channel autoplay, preview source). SWR for server data. Single <audio> element managed by AudioController. wouter for routing. framer-motion for channel entry stagger choreography and tab indicator animation. dnd-kit for track reorder in compile modal.
~~~

## History

**May 2026 — shipped**

Full three-page app live. Key notes from the build:

- **iTunes pivot**: switched from Spotify to the iTunes Search API for track metadata and preview URLs after discovering the November 2024 Spotify preview URL deprecation. iTunes previews are stable, publicly accessible 30-second MP3s with no OAuth requirement. Track search, metadata snapshot (title, artist, album, cover art, duration, preview URL), and Wire pool all run on iTunes data.
- **Broadcast-coded voice**: every user-facing string uses the Audial terminology — Set, Channel, Tune in, File to set, On Rotation, Heavy Rotation, Spins, Tuned in, Tuned to, Sign off. Empty states, errors, and confirmations all pass the "could this run in a magazine masthead" test.
- **Bone/Ink/chartreuse aesthetic**: the visual system landed as specced. Ink rules everywhere, no rounded corners, no shadows, Paper surface for elevated components. Signal chartreuse on neutral pages; user accent color takes over on channel pages.
- **On Air bar motion**: cover art punches to 0.96 scale on file action (200ms spring), `FILED ▪` chip overlays the thumbnail for 1.4s then fades, skip-forward icon advances The Wire. The bar persists across page navigation while audio is active.
- **Channel entry choreography**: accent sweep bar crosses the viewport in 380ms, followed by a staggered reveal — avatar and masthead, then Now Playing hero (cover scales from 0.97 to 1.0 with fade), then sections cascading below. `--accent` CSS variable set on the page root drives color propagation through every component.
- **Home tab indicator**: a 2px Ink underline animates between tabs via framer-motion `layoutId` — 220ms light spring, snaps to active tab on mount without transition.
- **Featured set mute toggle**: a `MUTE` / `UNMUTE` affordance in the top-right corner of the featured set cover lets the channel owner (and visitors) silence the autoplay without navigating away.
- **Populated-platform scenario**: 10 seeded curators with distinct handles, accent colors, bios, co-signs, and compiled sets form the default dataset. On first load, the On Rotation tab feels inhabited. New users see what the product can become before they've done anything.
