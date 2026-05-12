---
name: Web Interface
description: The Audial web app — three pages, top navigation, public browsing with reactive auth.
---

# Web Interface

Audial's web interface is a three-page application: **Home** (the feed), **Channel** (the user's profile, called Channel throughout), and **Search** (discovery + The Wire).

This spec describes the layout, components, and interactions of each page, plus the shell that wraps them. Visual rules (colors, type, spacing, motion) live in `@brand/`. The data model and methods live in `app.md`.

~~~
The web interface is a Vite + React project at `dist/interfaces/web/`. State management uses Zustand for a single global store hydrated on app load (current user, the audio context state, recently played tracks for The Wire's no-repeat rule). Server data uses SWR for cached fetching.

`web.json`:
```json
{
  "web": {
    "devPort": 5173,
    "devCommand": "npm run dev",
    "defaultPreviewMode": "mobile"
  }
}
```

Mobile preview default — Audial is primarily mobile, but desktop experience must be excellent (the design expert specified two/three-column editorial layouts on home and channel for desktop).
~~~

## App shell

The shell wraps every page and contains:

1. **Top navigation bar** (fixed, full width)
2. **Page content** (scrollable, with 72px reserved at the bottom)
3. **On Air bar** (fixed at bottom when audio active — see `visual.md`)
4. **Auth modal** (rendered conditionally on top of everything when triggered)

### Top navigation

Fixed header, 64px tall on mobile, 72px tall on desktop. Bone background, 1px Ink rule along the bottom edge.

Layout, left to right:

- **Wordmark** — the AUDIAL▪ wordmark, links to `/`. The chartreuse block pulses when audio is playing anywhere in the app.
- **Nav links** (center on desktop, replaced by a tab bar at the bottom on mobile narrower than 600px):
  - `HOME` → `/`
  - `CHANNEL` → `/c/me` (redirects to the user's own channel `/c/{handle}` when signed in, or triggers auth modal when anonymous)
  - `SEARCH` → `/search`
- **Right cluster** — broadcast timestamp `FRI 03.05.26 — 23:14 GMT` in mono (auto-updates), and a single auth/user affordance:
  - Anonymous: `TUNE IN` button (Ink fill, Bone text, mono UI label) → opens auth modal
  - Signed in: a small circular avatar (32×32) → opens a dropdown menu with `Channel`, `Edit channel`, `Sign off`

Nav link active state: Mono-Label, Ink color + 2px Ink underline. Inactive: Smoke + no underline.

~~~
On mobile (< 600px), the wordmark stays in the top header alone, and the nav links collapse into a fixed bottom navigation bar that sits above the On Air bar reservation. The bottom nav is 56px tall, Bone background, 1px Ink top rule. Three icons: Home (square grid glyph), Channel (a circle), Search (a magnifying glass). Active tab gets a 2px Signal underline at the very top of the icon. Use `tabler-icons` for the glyphs.

When the On Air bar is visible on mobile, it sits ABOVE the bottom nav (stacked: nav at very bottom, On Air bar above it). Reserve `padding-bottom: 56 + 72 = 128px` on mobile scroll containers when both are shown. On desktop, only the On Air bar reserves space; nav is at the top.
~~~

### Auth modal

A bottom sheet on mobile (12px top-corner radius, slides up over 280ms), a centered modal on desktop (no border-radius, 1px Ink border, 480px wide).

Two states inside:

1. **Tune in** — email input, "SEND CODE" button. Headline "Tune in." in Display weight 600. Below: a single Caption line — "Audial is a community for people who care about playlists. Compile, share, drift."
2. **Verify** — six 56×56 mono-font input boxes for the verification code, auto-advance, paste support, large + bold. On verification success: boxes briefly fill with Signal then fade as the modal closes. Below: "Resend in 30s" countdown, then a clickable "Resend" link.

After successful auth, if the user has no `handle` set, automatically transition the modal contents to a third state:

3. **Set your channel** — three inputs (handle, display name, optional bio), an accent color picker (preset strip + custom hex), and a "COMPILE CHANNEL" button. Validation inline in mono labels. On success, modal closes and the user lands wherever they originally tried to go.

~~~
The auth modal is implemented as a single component `AuthSheet.tsx` that handles all three states with internal state machine. It uses the `auth.sendEmailCode` / `auth.verifyEmailCode` SDK calls and reads the user's handle status via `getCurrentChannel` to decide whether to show the channel-setup state.

The "TAP TO TUNE IN" trigger pattern: any action that requires auth checks `auth.isAuthenticated()`, and if false, opens the modal with a stored "intent" callback (e.g., `() => navigate('/c/me')`). After successful auth + channel setup, the intent callback fires.
~~~

### Routing

- `/` — home
- `/search` — search and The Wire
- `/c/:handle` — a channel page (`me` is a special handle that resolves to the current user)
- `/s/:setId` — a set detail page (overlay/modal style on top of whatever page they came from, full page on direct load)

Use `wouter` for routing — light, no boilerplate.

## Page 1: Home

The feed. Magazine-style, asymmetric, mixed scales. Four tabs at the top control the content.

### Masthead

At the very top of the page, before the tabs:

- A small mono-label dateline on the left: `FRI 03.05.26 / 23:14 GMT — ISSUE 142` (issue number is a fun touch — generated from the date, displayed as `ISSUE [days-since-launch + 100]` so it's always a real number). Use only the dateline for now if generating issue numbers feels gimmicky in MVP — but include them, they ground the publication framing.
- A Display-XL editorial headline, 96-128px depending on viewport: a contextual phrase that rotates daily. For MVP: pick from a small array of editorial phrases like `"Heavy weather, late hours, cracked basements."`, `"Every set tells you who someone is."`, `"Quiet rooms, loud taste."`, `"Drift the schedule. Subscribe to a voice."`. Pick deterministically based on `floor(timestamp / 86400000) % phrases.length` so it stays the same all day. **The headline is just print-style flavor — non-interactive.**

Below the masthead, a 1px Ink rule, 48px space, then the tabs.

### Tabs

A horizontal row of four tabs as Mono-Label entries:

```
01 / SUBSCRIBED       02 / ON ROTATION       03 / HEAVY ROTATION       04 / DRIFT       [+]
```

- Each tab is a button. Active tab: Ink color + 2px Ink underline that animates between tabs (220ms, light spring per `visual.md`). Inactive: Smoke + no underline.
- The tab row scrolls horizontally on mobile, snapping the active tab to the left edge.
- The `+` button on the far right is a 36×36 Ink-bordered square (NOT a circle, NOT floating). Ink-color `+` glyph (24px). On hover: fills Signal. On click: opens a dropdown menu directly below it.

The `+` dropdown contents:

```
COMPILE A SET       — opens the Compile a Set modal
SHARE A SET         — opens the Share a Set modal (Spotify URL paste)
```

Both items are Mono-Label, hover state: shifts to Paper background. Click closes the dropdown and opens the appropriate modal.

~~~
Tabs use URL state: `?tab=subscribed | on-rotation | heavy-rotation | drift`. Default is `on-rotation` for both signed-in and anonymous users (the most engaging default — Subscribed often feels empty for new users).

When anonymous users click the SUBSCRIBED tab, the backend returns the same query as ON ROTATION, but the tab indicator gets a small mono "(PREVIEW)" suffix to be honest about the substitution. When they sign in, the tab transitions naturally to their real subscriptions.

The `+` button is gated by auth — clicking it while anonymous opens the auth modal with the intent set to "after auth, open compile/share modal."

On mobile narrower than 600px, the `+` button moves to a fixed position at the bottom-right of the viewport (above the On Air bar reservation), 48×48 Ink square (sharp corners), Ink-bordered, with the `+` glyph centered. Same dropdown behavior on tap.
~~~

### Feed content

Each tab renders the same feed structure but pulls from different sources. The feed is a magazine-style asymmetric layout with three card variants mixed:

**Hero card** (one per tab, at the top):

A two-column layout on desktop (one stacked column on mobile):

- Left: the cover art at full column width (~480-560px on desktop). 1:1 aspect ratio. Sharp corners.
- Right: editorial typography stack:
  - Mono-Label: `01 / FEATURED` (or just `FEATURED` if the section already has a number)
  - Display heading (Clash 600, ~56-72px): the set title
  - Mono-Meta: `[count] cuts · [duration]`
  - Body: the set description (or first 2 lines if longer)
  - Curator attribution: `by` (Caption) + `@handle` (UI weight 500) linking to the channel
  - A bottom row of two actions: `▶ PLAY` (filled Signal/accent button, Ink text) and `SUBSCRIBE` / `TUNED IN` (Ink-bordered, fills Ink + Bone text on subscribe).

**Compact card** (most of the feed):

A four-column grid on desktop (3 on tablet, 1.2 on mobile horizontal scroll fallback). Each card:

- Square cover art at full card width
- Below cover: 12px space
- Mono-Meta line: `[count] cuts · [duration]`
- Subhead title (Clash 500, 20px), 2-line clamp
- Mono-Meta: `by @handle`

Hover (desktop): Ink stroke inset on cover, mono "PLAY" badge in bottom-left of cover. No card lift.

**Editorial row** (used as a section divider every 6-8 sets):

A full-width row with:

- Left third: a Mono-Label section header like `02 / SAT NIGHT TRANSMISSIONS` (themed copy that fits the section, generated from a small pool of phrases)
- Right two-thirds: a horizontal scroll strip of 3-5 compact cards.

Mix scales aggressively — the design expert specified asymmetry over symmetry. Don't render uniform grids.

~~~
For MVP, the section themes are picked from a small pool of phrases per tab:
- ON ROTATION: "BROADCASTING NOW", "RIDING HIGH", "PEAK HOURS"
- HEAVY ROTATION: "CRATE STAPLES", "FILED & FILED AGAIN", "WORN GROOVES"
- DRIFT: "AT RANDOM", "OFF THE SCHEDULE", "DRIFT MODE"
- SUBSCRIBED: "FROM YOUR CHANNELS", "ON YOUR DIAL"

These are decorative — the actual content under each section is just more sets from the active tab. Picked deterministically by `index % phrases.length` so they don't shuffle on re-render.

Loading state: render 8 skeleton compact cards with the cover area as a Mist-filled box (no animation), title and metadata as 1px Mist rules. No shimmer. The hero card slot renders a single skeleton variant.

Pagination: infinite scroll. Use `getHomeFeed(tab, limit, cursor)`. Load 12 cards per batch. SWR with the cursor.
~~~

### Compile a Set modal

A full-screen takeover on mobile, a centered modal on desktop (640px wide, max-height 80vh). Bone surface, 1px Ink border on desktop, no border-radius.

Header: `COMPILE A SET ▪` (Mono-Label) on the left, X close button on the right.

Body (top to bottom):

1. **Title input** — Heading-style (Clash 28px), placeholder `Title your set.`. Underline-only border, 1px Ink, thickens to 2px on focus.
2. **Description input** — Body-style (Inter 15px), multiline, placeholder `Liner notes — optional.`, max ~280 chars, character counter in mono on the bottom-right.
3. **Cover** — a 120×120 square preview on the left, two buttons stacked on the right: `UPLOAD COVER` (file picker → CDN upload via `platform.uploadFile`) and `USE A SEED COVER` (opens a small grid of the 6 seed covers from `@brand/visual.md`, one click selects).
4. **Add cuts** — a search input ("Search Spotify for cuts.") that calls `searchSpotifyTracks` with debounce (250ms). Results render as a numbered list below: `01` mono number, 48×48 cover, title (Subhead), artist (Caption smoke), duration (mono). Each row has a `+` button on the right that adds the track to the set. Added tracks move to a separate "ADDED" section below the search results, with track numbers rotating to match their order. Drag-to-reorder via `dnd-kit` or HTML5 drag events; a remove `×` button per added row.
5. **Footer** — `CANCEL` (text-only) on the left, `COMPILE` (Signal fill, Ink text, mono UI label) on the right. Disabled until title is set; tracks are optional.

On submit: calls `compileSet`, closes modal, navigates to `/s/:setId` to show the new set. No success toast — the navigation IS the confirmation.

### Share a Set modal

Similar shell to Compile a Set but smaller (480px wide on desktop).

Single input: `Paste a Spotify playlist URL.` (mono placeholder). Below input: "We'll resolve this on Spotify and compile a snapshot into your channel." (Caption Smoke).

Footer: `CANCEL` and `SHARE` (Signal fill).

On submit: calls `importSpotifyPlaylist`, shows mono `Receiving...` state in the button while resolving (button width fixed via min-width). On success: closes, navigates to the new set page. On error: inline mono-label error below the input ("Source not found. Check the URL.", "Source is private...").

## Page 2: Channel

The channel page is a viewer's primary impression of another curator. Structurally the same layout for "your own channel" and "someone else's channel," with the editing affordances appearing only when the viewer is the owner.

URL: `/c/:handle`. The special handle `me` resolves to the current user's channel and triggers the auth modal if anonymous.

### Channel page layout

The page enters with the **tuning-in animation**: a 4px horizontal accent-colored bar sweeps left-to-right across the very top of the page in 380ms, while the featured set's cover art scales from 0.97 to 1.0 with a fade-in over 400ms (per `visual.md`).

The page sets `--accent` to the channel owner's accent color on its root container. Every chartreuse-occupying element on this page now uses the owner's accent.

Layout — desktop (single column max-width ~1180px, centered, with 64-96px outer margins):

**Section 1: Channel masthead** (no number — it's the page header)

A two-column sub-layout:

- **Left column (~40% width):** the avatar (160×160 circle), the display name in Display 600 (~64-72px, tight), the handle `@handle` in Mono-Meta below, and the notes/bio in Body.
- **Right column (~60% width):** a metadata strip in Mono-Meta:
  - `[X] cuts compiled · [Y] sets · [Z] tuned in · [W] tuned to`
  - Below: action row — `SUBSCRIBE` / `TUNED IN` (or `EDIT CHANNEL` for owner), `SHARE`. Each as Ink-bordered buttons except the active state on Subscribe (filled accent, Ink text, label "TUNED IN").

A 1px Ink rule below the masthead.

**Section 2: Now Playing** (`01 / NOW PLAYING` if a featured set exists; section is hidden entirely if not)

The featured set's cover renders as a hero, 100% column width on mobile, ~70% width on desktop with set metadata to the right:

- Cover art at 480-600px tall, square, sharp corners
- A small "NOW PLAYING" tab in a Bone background sits over the top-left of the cover (overlay positioning)
- A 2px accent vertical bar runs against the left edge of the cover when audio is playing
- Right column: Heading (set title in Clash 600), Mono-Meta (cuts + duration), description (Body), curator (the channel owner — `by @handle`), and an action row: `▶ PLAY`, `OPEN SET` (links to `/s/:setId`).

Auto-play behavior: on the channel page, the featured set begins playing 30-second previews automatically (subject to autoplay policy — see `visual.md`). Tracks advance through the set and loop back to the start. Pauses The Wire when active.

A small mono "MUTE" toggle sits over the top-right corner of the featured cover for the viewer to disable autoplay.

**Section 3: Selections** (`02 / SELECTIONS`)

The channel owner's pinned sets — a horizontal grid of compact cards. Up to 6. If the owner has no selections, the section is hidden.

For owners viewing their own page, an "EDIT" Mono-Label appears at the right side of the section header that lets them pin/unpin sets (managed in the Edit Channel modal).

**Section 4: Co-signs** (`03 / CO-SIGNS`)

A horizontal strip of artist tiles — circular artist images (80×80), name below in UI weight 500, no link target on click for MVP (could open Spotify in a future iteration). Hidden if no co-signs.

**Section 5: All compiled sets** (`04 / IN ROTATION`)

A four-column grid (compact card variant from the home feed) showing all sets the channel has compiled, newest first. Pagination via "LOAD MORE" button at the bottom (no infinite scroll on this section — finite content).

For owners viewing their own page, each card has a small mono-label "EDIT" + "DELETE" hover affordance.

~~~
Loading sequence:
1. Page mount → kick off `getChannel(handle)` SWR fetch.
2. Render the page's skeleton with `--accent: var(--mist)` so the page looks empty-but-structured immediately. Once the channel data arrives, swap `--accent` to the owner's color, fade in the masthead and hero (300ms opacity).
3. Featured set audio: only start trying to play after the channel data resolves AND the user has interacted at least once in the session.

Channel page entry animation: use `motion`'s `layoutId` on the cover art so coming from a feed card transitions the cover art physically. Layout ID format: `set-cover-${setId}`.

For owners, Edit affordances open the Edit Channel modal (described below).
~~~

### Edit Channel modal

Same shell as Compile a Set. Sections (vertically stacked):

1. **Avatar** — current avatar, "UPLOAD" button. Square crop preview.
2. **Handle** — input. Validates on blur (lowercase only, 3-20 chars, alphanumeric + `.` + `_`, must be unique). Mono error label inline.
3. **Display name** — input.
4. **Notes** — multiline input, ~280 char counter.
5. **Accent color** — the preset swatches strip (18 swatches, 32×32 squares, sharp corners) followed by a "Custom" pill that expands to reveal a hex input. Live preview: as the user picks, the modal's surrounding background gets a 4px accent-color top bar (echoing the channel page entry gesture). Validation per `colors.md` guardrails.
6. **Featured set** — a dropdown showing the user's compiled sets. Selecting one previews its cover at 80×80 to the right.
7. **Selections** — a multi-select grid of the user's compiled sets, up to 6 selectable.
8. **Co-signs** — a search input that calls `searchSpotifyArtists` (a method we expose for this; same client-credentials Spotify API, artist search), and a strip of selected artists below. Add via search, remove via tap.

Footer: `CANCEL` + `SAVE`. On save, calls `updateChannel`, modal closes, channel page re-fetches.

~~~
For MVP, `searchSpotifyArtists` is a small method that calls `https://api.spotify.com/v1/search?q={q}&type=artist`. Store on co-signs: `{ spotifyArtistId, name, imageUrl }`. Image URL comes from Spotify's smallest artist image.

The accent picker live-preview: as the user clicks a swatch, set `--accent` on the modal's root via `style={{ '--accent': hex }}`. The 4px top bar uses `var(--accent)`. After save, the channel page re-renders with the new accent.
~~~

## Page 3: Search

The discovery page. Two interacting elements: a search input and lanes of results, plus the always-on **Wire** radio panel.

### Page layout

Desktop: a two-column layout. Search input + results on the left (~60%), Wire panel on the right (~40%). 1px Ink vertical rule between them.

Mobile: stacked. Search + results on top, Wire panel below. Wire panel still anchored visually (a 1px Ink rule above and below it).

### Search input

Top of the left column. Full width within its column. **No border, no background, just a 1px Ink underline** — thickens to 2px on focus.

Placeholder: `Search sets, channels, cuts.` set in Clash Display weight 500 at 24px (looks like a magazine subhead, not a form field).

Below the input, a thin Mono-Label hint: `RESULTS UPDATE AS YOU TYPE.`

### Search results

When the input has content (250ms debounce), three lanes render below:

```
01 / SETS                                                [count] results
[numbered list of sets, max 6 visible — with "see all" if more]

02 / CHANNELS                                            [count] results
[numbered list of channels]

03 / CUTS                                                [count] results
[numbered list of tracks]
```

Each lane:

- Numbered rows (`01`, `02`, `03`...) in mono.
- For sets: 48×48 cover, title (Subhead), curator + cuts count (Mono-Meta).
- For channels: 48×48 avatar (circle), display name (Subhead), handle + tuned-in count (Mono-Meta).
- For tracks: 48×48 album cover, title (Subhead), artist (Caption smoke), duration (mono). Hover shows a small mono "PREVIEW" badge that, on click, plays the 30s preview through the On Air bar (interrupting The Wire). Plus a mono `+` button to file the track to a set (opens the file-to-set picker).

Empty state (no query): a centered editorial pull-quote in Heading style: `Search for sets, channels, or cuts. Or drift on The Wire.` Below it, a small "FEATURED CURATORS" Mono-Label header followed by 3 channel rows from the platform.

Loading state: 5 numbered placeholder rows per lane that match real row dimensions exactly.

### The Wire panel

The constant radio. Right column on desktop, below search on mobile. Bone surface, 1px Ink border around it, no rounded corners.

Layout (top to bottom inside the panel):

1. **Header** — Mono-Label `THE WIRE / NOW BROADCASTING` on the left, a pulsing Signal dot + `LIVE` mono-label on the right.
2. **Cover** — 100% panel width, 1:1 aspect ratio (so on desktop it's a ~360-440px square). Current track's album cover, sharp corners. A 2px Signal vertical bar runs against the left edge when the audio is actively playing. Hovering does not show a play badge — instead the current track's metadata floats over the cover's bottom-left corner in a Bone tab when audio is paused (`▶ TUNE IN` to resume).
3. **Track meta block** — directly below the cover:
   - Heading (set title for the source set this track came from)
   - Subhead (track title)
   - Caption: `by @curator-handle` linking to their channel + `from "Set Title"` linking to the set
   - Mono-Meta: `[mm:ss] / 0:30  ·  filed in [count] sets`
4. **Action row** — two buttons side by side, equal width:
   - `▶ PAUSE` / `▶ PLAY` (Ink-bordered, mono UI label)
   - `FILE TO SET` (Signal fill, Ink text, mono UI label) — opens the inline file-to-set picker

5. **The file-to-set picker** (collapsed by default, expands inline below the buttons when File to Set is tapped):

   - Mono-Label header: `FILE TO`
   - A scrollable list of the user's compiled sets, each row: 32×32 cover, title (Subhead), cuts count (mono). Click a row to file.
   - At the top of the list, a special `+ COMPILE NEW SET` row that opens the Compile a Set modal preloaded with the current track.
   - Closes on outer click or after a successful file action.
   - Anonymous users: instead of the picker, show `Tune in to file cuts.` + a Tune in button.

6. **Skip** — a small mono "SKIP →" link below the action row that advances The Wire to the next track.

Behavior:
- The Wire begins playing the moment the user lands on `/search` (subject to first-interaction autoplay block — see `visual.md`).
- When audio plays, the global On Air bar at the bottom shows the same track. If the user navigates away from `/search`, The Wire keeps playing in the background; the On Air bar persists.
- Track ended → call `getNextRadioTrack`, swap the cover and metadata, audio plays the new track. Pre-fetch the next track's preview during current playback for gapless transition.
- Filing a track: the cover does the 0.96 scale punch (200ms), `FILE TO SET` button label flashes to `FILED` for 1.4s above the bar, then resumes. The picker collapses. Audio keeps playing.
- Clicking a track-result row's `+` button (in search results) opens the same file-to-set picker as a small popover anchored to that row. Same pattern.

~~~
Implementation specifics:

- The Wire's current track is in the global Zustand audio store: `{ currentTrack, isPlaying, queue, recentTrackIds, source: 'wire' | 'channel' | 'preview' }`. The On Air bar reads from the same store.
- When `source === 'wire'`, advance via `getNextRadioTrack`. When `source === 'channel'`, advance through the channel's featured set tracks. When `source === 'preview'` (search result preview), play once and resume the prior `wire` source after.
- Audio is rendered by a single `<audio>` element managed via React state effects in a top-level `AudioController` component. Don't have multiple audio elements.
- For the marquee strip in the On Air bar: the Wire's source set's title + curator handle scroll continuously.
- Pre-fetch next track: when current track has 8s remaining, call `getNextRadioTrack` and load its preview URL into a hidden `<audio>` element to warm the cache, then promote it on `ended`.
- For mobile, the Wire panel sits below the search section, full width, ~480-560px tall total. Same structure but the cover is smaller.
- The search input on mobile uses a smaller Clash size (20px) to keep it readable on narrow viewports.
~~~

## Set detail page (`/s/:setId`)

A focused view of a single set. Reachable from any feed card, search result, or channel page.

Layout:

- Top: a back button (`← BACK` mono label, links to history) + share button on the right
- Hero block: cover art (~50% width on desktop, full width on mobile), Heading set title, curator attribution + cuts/duration in mono, description in Body, action buttons (`▶ PLAY ALL`, `FOLLOW` if anonymous opens auth, owner-only `EDIT` and `DELETE`).
- Track list: numbered rows (mono `01`, `02`...), 48×48 cover, title (Subhead), artist (Caption smoke), duration (mono). Click a row to play that single track's preview through the global player. A small `+` (file to set) button per row for anyone signed in (other than the owner of this set viewing their own).

When a track is playing through this page, the corresponding row's mono number changes to a small Signal/accent dot, the track row gets a 2px accent left border, and the global On Air bar shows the track.

~~~
Set detail can be rendered either as a full page (direct load) or as an overlay modal slid in from the right on top of whatever page (when reached from a feed card click). The overlay style allows the user to keep their browse context. For MVP, build it as a full page only — overlay is roadmap polish.
~~~

## First-time experience

When a brand-new user signs up:

1. Email entered → code sent → 6 boxes filled → success animation.
2. Without dismissing the modal, transition to "Set your channel" state. They pick handle, name, notes, accent. They commit.
3. Modal closes. The user lands on whatever page triggered the auth flow (or `/c/:handle` if they came from clicking the Channel nav link).

The first impression on any page should already feel populated — that's the job of the `populated-platform` scenario. Even if the user signs up with no platform data of their own, the home feed shows real curators and real sets (because of the seeded data), and they immediately see what's possible.

We don't show an onboarding tour. The masthead, the editorial copy, and the empty-state microcopy do all the orientation work.

## Public browsing (anonymous)

Important: every read-only surface works without auth. Anonymous users can:

- Land on `/` and browse the home feed (Subscribed tab shows On Rotation content with a `(PREVIEW)` mono indicator)
- Visit `/search`, search anything, listen to The Wire
- Visit any `/c/:handle` and see the full channel
- Visit any `/s/:setId` and see the set's tracks, play previews

Anonymous users CAN'T:

- Compile or share a set (the `+` opens auth modal)
- File a track (the file-to-set button opens auth modal)
- Subscribe (subscribe button opens auth modal)
- Visit `/c/me` (redirects to auth modal)
- Edit anything

Auth modal is always reactive — never shown unless the user attempts an action that requires it.

## Components inventory

For implementation reference, these components recur and should be built as a small UI library:

- `Wordmark` — the AUDIAL▪ mark with optional pulsing
- `MonoLabel` — Mono-Label section header with number prefix support
- `SectionHeader` — Mono-Label + optional right-aligned mono metadata, 1px Ink rule below
- `CoverArt` — square image with aspect-ratio enforcement, optional hover treatment, optional active-playback indicator (left edge bar)
- `SetCard` — three variants: hero, compact, list-row
- `ChannelRow` — used in search results and follower lists
- `TrackRow` — numbered, with optional play-state indicator and file-to-set affordance
- `MonoButton` and `FilledButton` — primary action buttons with min-width preservation
- `OnAirBar` — the persistent bottom bar
- `WirePanel` — the search-page radio panel
- `AuthSheet` — the multi-state auth modal
- `EditChannelModal`, `CompileSetModal`, `ShareSetModal` — the three primary modals

All composed of CSS variables (`--bone`, `--paper`, `--ink`, `--smoke`, `--mist`, `--signal`, `--heat`, `--accent`) so the channel-page accent override works through a single CSS-variable swap.

~~~
The brand utility module (`src/brand/`) on the frontend contains:
- `accent.ts` — preset list, validateAccent function, accent-on-text derivation
- `seedCovers.ts` — the 6 seed cover URLs with helper for CDN-resized variants
- `theme.css` — all CSS variables and base resets

Component library lives in `src/components/`. Pages in `src/pages/`. Audio store in `src/store/audio.ts`. Auth state in `src/store/auth.ts` (wraps the SDK's `auth` module).
~~~
