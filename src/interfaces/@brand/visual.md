---
name: Visual Identity
description: Surfaces, spacing, layout, motion, and the signature patterns that make Audial feel like a publication.
---

# Visual Identity

Audial is **printed matter, not software.** The app feels like a record sleeve, a club flyer, an NTS schedule page — confident, terse, typographic. The system commits to one move: **bone paper + ink black + one electric signal color** (or, on a channel page, the channel owner's accent in place of Signal).

This document specifies the surfaces, spacing, layout principles, motion rules, and the signature patterns that recur across screens. Pages are described in `web.md`.

## Three governing principles

1. **Cover art is sacred.** Square. Sharp corners. Full-bleed inside its container. No rounded radii, no drop shadows, no overlays at rest. The art is the content; the chrome serves it.
2. **Mono-for-metadata.** Track counts, durations, dates, IDs, BPM, broadcast timestamps — every number, every metadata label, set in Geist Mono. This is the NTS DNA strand and it is non-negotiable.
3. **One accent at a time.** The system uses Signal (chartreuse) for Audial-owned moments. On a channel page, Signal is replaced entirely by the channel owner's accent color. They are never both on screen. This keeps the system clean and gives users real ownership.

## Surfaces and elevation

- **No drop shadows. Ever.** Shadows are a tech tell. Use 1px Ink rules to separate, or shift to Paper for elevation.
- **No glassmorphism, no backdrop-blur.** The system is flat-on-paper.
- **No rounded corners on cover art, on cards, or on most layout containers.** 0px radius.
- **Functional rounding (rare):**
  - Buttons and inputs: 4px radius. Just enough to read as interactive.
  - Modal sheets: 12px radius on top corners only (when shown as bottom sheets on mobile). 0px on desktop modals.
  - Avatars: full circle. The only place curves are welcome — they signal a person.
- **Hover state on neutral surfaces:** shift surface from Bone to Paper. No shadow, no scale, no lift.

## Spacing scale

Commit to this exactly: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`.

- 16/24 for inter-element rhythm
- 48/64 for section breaks
- 96/128 for editorial breathing room around Display-XL moments
- 4/8 reserved for tight metadata clusters (mono labels next to numbers)

## Layout principles

- **Asymmetry over symmetry.** The home feed is a magazine, not a card grid. Some sets get full-width editorial features (cover left, big Clash Display title right), others appear as compact mono-labeled rows. Mix scales aggressively.
- **Vertical rule structure.** Use 1px Ink vertical rules to separate columns on desktop, like a printed schedule. Reference: the NTS schedule grid.
- **Numbered lists.** Track lists, search results, set indexes — number them in mono (01, 02, 03...). Like a record sleeve back cover.
- **Section headers are split lockups.** `[number] / [LABEL]   [secondary metadata right-aligned in mono]`. Always followed by a 1px Ink hairline rule.
- **Generous outer margins, tight inner content.** Desktop: content max-width ~1280px, ≥ 64px outer margins. Mobile: 20px outer margins.

## Cover art treatment

The standard rules across every cover, every size:

1. **Square, sharp, full-bleed.** No padding inside the image.
2. **No filters, no overlays at rest.** Show the art the curator chose.
3. **Hover (desktop) / focus (touch):** add a 1px Ink stroke INSIDE the image (`box-shadow: inset 0 0 0 1px var(--ink)`), and overlay a Mono-Label "PLAY" badge in the bottom-left corner with a 4px Bone background pad. **No scale, no zoom, no tilt. Restraint.**
4. **Active playback:** a 2px vertical bar in Signal (or user accent on channel pages) flush against the LEFT edge of the cover, animated in via `width: 0 → 2px` over 200ms. This is the "On Air" indicator.
5. **Track row covers** (in playlist details): 48×48, no border, no hover treatment.
6. **Hero cover on a channel's featured set:** 100% column width, 400-600px tall, with a "NOW PLAYING" Mono-Label sitting over the top-left in a small Bone tab.

Always wrap cover art images in a container with explicit `aspect-ratio: 1 / 1` so the image reserves its box before the network response lands. Never let cover art pop in.

## The persistent "On Air" bar

A 72px-tall bar at the bottom of the viewport, full width, Ink background, Bone text. Appears whenever audio is playing in the app — driven by The Wire on the search page or by a channel's auto-playing featured set.

The bar contains, left to right:

1. **Cover art** — 72×72, sharp, full-bleed in the bar height. A 2px Signal/accent vertical bar runs against its left edge.
2. **"On Air" cluster** — pulsing Signal dot (1.6s loop, opacity 1 → 0.4 → 1) + Mono-Label "ON AIR" text. Separated from the next section by a 1px Ink rule.
3. **Marquee strip** — track + artist + source set + curator, scrolling left over 60 seconds, looping. Pause on hover. Inter for names, Geist Mono separators (`///`). Fixed-height container — multi-line titles never break the bar's geometry.
4. **Right cluster** — duration in mono (`0:18 / 0:30`), progress fill (1px Ink line filling along the bottom edge of the entire bar), and the **File to Set** button. Button uses Signal background + Ink text on neutral pages, accent + Ink on channel pages. **Min-width set so the label can swap to "Filed" without resizing.**

Layout reservation: every scrollable view has `padding-bottom: 72px` reserved at all times, so the bar never pushes content when it appears. Don't toggle this padding — keep it always-present.

~~~
The wireframe of this bar:

```html
<div class="bar"><!-- 72px tall, var(--ink) bg -->
  <div class="cover">[72×72 art with 2px accent left-edge]</div>
  <div class="live">
    <div class="dot"></div><!-- 7×7 chartreuse, pulsing -->
    <span class="mono-label">ON AIR</span>
  </div>
  <div class="marquee">
    <div class="marquee-inner">[scroll content, paused on hover]</div>
  </div>
  <div class="right">
    <span class="dur mono">0:18 / 0:30</span>
    <button class="file">FILE TO SET</button>
  </div>
</div>
```

Signature behaviors:
- Marquee uses CSS `@keyframes` linear scroll, never JS.
- The 1px progress line fills along the bottom of the WHOLE bar (full width), not just inside the right cluster.
- "FILE TO SET" → "FILED" swap is a 1.4s mono-label flash above the bar, then the button label resumes. Button width does not change.

When the bar is hidden (no audio active), the 72px reservation is empty space at the bottom of the viewport. Acceptable — better than layout shift on entry.
~~~

## Motion and interaction

The system is **mostly hard cuts with one signature gesture.** Print publications don't fade between pages, and Audial shouldn't either.

- **Page transitions:** 120ms opacity-only crossfade. `cubic-bezier(0.4, 0, 0.2, 1)`. No slides, no parallax, no shared-element transitions for routine navigation.
- **Channel entry (the exception):** Entering a channel page triggers the "tuning in" gesture. The featured set's cover art animates from `scale(0.97) → scale(1)` and `opacity 0 → 1` over 400ms with `cubic-bezier(0.2, 0.85, 0.25, 1)`. Simultaneously, a 4px-tall horizontal bar of the channel's accent color sweeps from left edge to right across the very top of the page in 380ms. Use Motion's `layoutId` so the cover art animates physically continuous from wherever it was clicked from in the feed.
- **Cover art hover (desktop):** 1px Ink inset border appears in 100ms, mono "PLAY" badge fades in (Bone tab in bottom-left), 100ms. No scale.
- **On Air bar entry:** slides up from the bottom edge, 280ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`. Content above does not move (the 72px reservation is permanent).
- **Marquee:** 60s linear loop continuous scroll, paused on hover, CSS keyframes only.
- **Tab switching on home:** the underline indicator slides between tabs over 220ms with a spring (Motion `stiffness: 380, damping: 32`). Content below crossfades over 120ms.
- **The Wire save action:** when File to Set is tapped, the cover art does a single `1.0 → 0.96 → 1.0` scale punch over 200ms total (hard cut into the press, ease out of release). A Mono-Label "FILED" appears for 1.4s above the bar, then fades. **No toast notifications anywhere** — the system speaks through existing chrome.
- **Wordmark broadcast block:** when the global audio context is active, the chartreuse block pulses opacity `1 → 0.4 → 1` over 1.6s ease-in-out, infinite. Stops on pause.
- **Form errors:** mono-label text appears below the input, 100ms fade-in. No shake, no red glow, no scary outline.

**What NOT to do:** no bounce, no overshoot, no playful spring on UI elements (springs only for tab indicators), no card flips, no parallax scrolling, no number-counter animations, no confetti, no celebratory moments. The aesthetic is **cool detachment**. Audial is a publication, not a game.

## The accent color system in practice

When a viewer is on the home page, search page, or any system-owned surface, the active accent is **Signal** (chartreuse). This drives the wordmark dot, the home tab indicator underline, the on-air pulse, the primary CTA fill on neutral pages.

When a viewer enters a channel page (their own or anyone's), the active accent becomes **the channel owner's chosen accent**. This propagates to:

- The accent bar that sweeps across the top during entry
- The "Now Playing" tab that sits over the featured set's cover
- The On Air vertical bar on the featured set's hero
- The File to Set button background
- The channel's section header underlines
- The subscribe button's filled state ("Tuned in")
- Any chartreuse-occupying small dots and tabs on the page

Implementation pattern: set `--accent` as a CSS custom property on the channel page's root container. Every visual element that uses Signal references `var(--accent)` instead. On non-channel pages, `--accent` defaults to `var(--signal)`. The change is instant, no page reload required, no re-render — driven entirely by the CSS variable.

## Layout stability rules (read carefully)

This app has **a lot of audio state changing constantly** — track ends, the next loads, radio shifts, save buttons trigger feedback. The temptation to insert toasts, expand cards, or push content around will be enormous. Resist it.

- **Reserve 72px at the bottom of every scrollable view** for the On Air bar, always. Don't let it push content when it appears.
- **Cover art containers use explicit `aspect-ratio: 1 / 1`** so images reserve their box before loading.
- **The "FILED" confirmation overlays the bar; it does not push it.** Position absolute, fade in/out, never affect bar height.
- **Marquee text in the On Air bar is in a fixed-height container.** Multi-line track titles never break the bar's geometry.
- **Tab content on home uses `min-height: 70vh`** so switching tabs while content loads doesn't collapse the page.
- **The radio "save" button keeps fixed width** whether label is "FILE TO SET" or "FILED". `min-width` based on the longer string in mono UI font.
- **Skeleton states match the final layout's dimensions exactly** — no shift on data arrival.
- **Search results render numbered placeholder rows during fetch** that match real rows in height.

## Audio behavior rules

- **Single global audio context.** Only one audio source plays at a time across the whole app. Entering a channel that auto-plays its featured set pauses The Wire. Closing the channel resumes The Wire.
- **30s preview progress** is rendered as a 1px Ink line that fills horizontally along the bottom of the On Air bar. No labels other than `0:18 / 0:30` in mono next to it.
- **First-interaction autoplay block.** Browser autoplay policy will block initial playback before any user interaction. Show a "TAP TO TUNE IN" Mono-Label overlay on the radio panel until first interaction. Don't break the aesthetic with a permission modal. Once any audio has played in the session, subsequent autoplay (entering a channel) works freely.
- **Channel featured set on entry.** First profile visit per session shows a small "PRESS PLAY" Mono-Label badge over the featured cover until the user clicks. After that, all channel visits autoplay freely.
- **Tracks without preview URLs.** Render as normal in set track lists with a small mono "NO PREVIEW" badge instead of the play affordance. They're still valid set entries — they just can't play in-app.

## Seed cover art

Six brand-aligned cover images for use in scenarios and as fallback options when a user doesn't upload a cover. All hosted on the i.mscdn.ai CDN.

| Slot name | Description | URL |
|---|---|---|
| crowd | Documentary club photography, motion-blurred crowd | `https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images/99ae35e7-d191-4898-9dc3-0401ea519508.png` |
| riso | Two-color risograph print (chartreuse + black) | `https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images/c234c596-734e-4266-bf25-25546eede344.png` |
| brutalist | Brutalist concrete architecture detail | `https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images/f329051a-8035-4832-8d8d-7b328706925f.png` |
| laser | Long-exposure club lasers, magenta + cyan | `https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images/7b2e2c54-9d8b-40a7-a7d5-e688166e51c3.png` |
| vinyl | Stacked vinyl records, warm light | `https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images/736c5f12-bdf6-42b2-91ae-b0520837f77a.png` |
| silhouette | Red-lit silhouette portrait, smoky | `https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images/ef409b26-2dea-431c-93c4-7b12256597dd.png` |

Always request CDN-resized variants for in-app use: append `?w=800&fm=webp&dpr=3` for hero treatments, `?w=400&fm=webp&dpr=3` for feed cards, `?w=120&fm=webp&dpr=3` for small thumbnails.

~~~
Reference these in code as a centralized constants module so scenarios, the cover-picker UI, and any fallback paths share the same source: `dist/interfaces/web/src/brand/seedCovers.ts` and `dist/methods/src/common/seedCovers.ts`.
~~~

## What success looks like

When this is done right, screenshotting any single screen of Audial and posting it on Mobbin or Are.na should make people think it's a real, shipping product from a music brand with serious design taste. If a screen could be mistaken for Spotify, Apple Music, SoundCloud, or any generic dark-mode music app, it has failed.

The cream paper, the mono metadata, the chartreuse block, the numbered editorial sections — these are the signatures. Every screen carries them.
