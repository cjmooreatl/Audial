---
name: Voice & Terminology
description: Brand voice, microcopy, and the rename map for product nouns and verbs.
---

# Voice

Audial speaks like a publication, not an app. The voice is **terse, declarative, broadcast-coded**. Music people don't ask, they pronounce. Borrow rhythms from radio scheduling, liner notes, club listings, record sleeve back covers. Every string is a chance to commit to the persona — single words, mono metadata, no apologies.

## Renames

These terms replace the generic product equivalents. They appear in the UI, microcopy, error messages, and any user-facing string. Internal code (method names, table names, variable names) can use either — but anywhere a string is rendered to the user, use the Audial term.

| Default term | Audial term |
|---|---|
| Playlist | **Set** |
| Create playlist | **Compile a set** |
| Following (tab) | **Subscribed** |
| Trending (tab) | **On Rotation** |
| Top Listened (tab) | **Heavy Rotation** |
| Random (tab) | **Drift** |
| Save to playlist | **File to set** |
| Profile | **Channel** |
| Bio | **Notes** |
| Pinned playlists | **Selections** |
| Favorite artists | **Co-signs** |
| Search radio | **The Wire** |
| Featured playlist on profile | **Now Playing** (or **On Air** when actively playing) |
| Tracks (count) | **Cuts** (e.g., "14 cuts · 52:18") |
| Plays (count) | **Spins** |
| Followers | **Tuned in** |
| Following (count) | **Tuned to** |
| Sign up / Log in | **Tune in** |
| Sign out | **Sign off** |

~~~
Where the rename produces awkward duplication ("Subscribed channels: 14 tuned to"), preference clarity over strict adherence — but only in those edge cases. The default is always the Audial term.

For numeric counts, the voice is "[count] cuts", "[count] spins", "[count] tuned in" — always lowercase noun, mono-set count.
~~~

## Microcopy patterns

### Empty states

Declarative, no apologies, no prompts to "get started." A single statement followed by a single CTA where appropriate.

- No sets compiled yet → `No transmissions yet. Compile a set.`
- No subscriptions → `Tune to a channel to fill this feed.`
- Channel has nothing filed → `Nothing on rotation. The Wire is live — drop in.`
- Empty search → `Search for sets, channels, or cuts.`

### Confirmations

Single word + mono timestamp where helpful. Never a celebratory tone, never an exclamation point.

- Track filed to set → `Filed.` (then a 1.4s flash, no toast)
- Set published → `Compiled. → 18:43 GMT`
- Profile updated → `Updated.`
- Subscribed to a channel → `Tuned in.`
- Unsubscribed → `Tuned out.`

### Errors

Broadcast-coded. Calm, never alarmed.

- Generic failure → `Signal lost. Retry.`
- Network failure → `Off air. Check your connection.`
- Invalid input → `Out of range.` (with mono detail line below: e.g., `Handle must be 3-20 characters.`)
- Wrong verification code → `Wrong code. Try again.`
- Code expired → `Code expired. Resend.`
- Spotify import: playlist not found → `Source not found. Check the URL.`
- Spotify import: private playlist → `Source is private. Make it public on Spotify or compile from scratch.`

### Loading and progress

- Initial load → `Tuning in...`
- Search → `Receiving...`
- Submitting form → button label swaps to a small spinner, never to text.
- Slow operation → `Processing...` (last resort; prefer skeletons).

### CTAs

Verb-only or verb + noun. Never "Click here", "Get started", "Learn more", "Try it now".

- `Compile`
- `File to set`
- `Subscribe` / `Subscribed` / `Unsubscribe`
- `Drift again`
- `Tune in` (sign in / sign up)
- `Sign off`
- `Edit`
- `Delete`
- `Share`

### Hints and placeholders

Bio placeholder: `Your channel. What's on rotation, what's broadcasting, who you ride for.`

Set title placeholder: `Title your set.`

Set description placeholder: `Liner notes — optional.`

Search input placeholder: `Search sets, channels, cuts.`

Spotify import placeholder: `Paste a Spotify playlist URL.`

Handle input placeholder: `your.handle`

## Tone examples

- New set flow header: `Compile a set. ▪`
- The Wire panel header: `THE WIRE / NOW BROADCASTING`
- Drift tab when refreshed: `New rotation. ▪`
- Auth modal headline: `Tune in.`
- Channel subscribe button (subscribed state): `Tuned in.`
- Profile setup header: `Set your channel.`

## What to avoid

- No emojis in product copy (the wordmark's chartreuse block is enough).
- No em dashes in microcopy. Use periods, commas, parentheses, or the `▪` mark for visual breaks.
- No "Oops!", no "Whoops!", no "Yay!".
- No marketing-speak: no "transform", no "discover", no "amplify", no "elevate", no "unlock", no "next-level".
- No exclamation points anywhere.
- No "Welcome to [App]!" greetings. The masthead loads, the user is in.
- No celebratory empty-state illustrations or mascots. The system speaks through type and rules.

~~~
Voice consistency is the difference between Audial reading like a real publication and reading like a templated SaaS app with custom wallpaper. Every string written for the product should pass the test: "Could this run in the masthead of a printed magazine?" If it can, ship it. If not, rewrite.
~~~
