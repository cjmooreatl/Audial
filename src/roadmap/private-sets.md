---
name: Private Sets and the Go-Live Moment
description: Compile sets privately in draft before they're ready, then broadcast them live — giving the act of publishing real dramatic weight.
effort: small
status: planned
---

Every set is currently public the moment it's compiled. That means curators ship half-finished work or never start until they have something complete. Private drafts fix the first problem. The go-live moment — a single deliberate action that pushes a set to your subscribers' feeds — fixes the second. Publishing becomes a broadcast, not a save.

## What it looks like

- In the Compile a Set modal, a small toggle at the bottom: `BROADCAST NOW` / `DRAFT`. Default is `BROADCAST NOW` (no behavior change for users who don't need drafts).
- Sets in draft mode appear on your own channel under `04 / IN ROTATION` with a `DRAFT` Mono-Label badge — visible only to you. Draft sets are invisible to all other users, including via search.
- When you're ready: open the set, hit `GO LIVE`. A 2px accent bar sweeps left-to-right across the set's cover (same gesture as the channel entry animation), and the set becomes public. Confirmation: `On air. ▪ 18:43 GMT`.
- Optionally, going live triggers a notification to your subscribers (see: Transmissions) so they know there's something new on your channel.

## Key details

- A `visibility` field on the set: `public` or `draft`. Default `public` for backward compatibility.
- Draft sets are excluded from all feed queries, search results, The Wire pool, and spin counts.
- The set detail page (`/s/:setId`) returns a 404-equivalent for draft sets when the viewer is not the owner — `Off air. Nothing here.`
- A set can be toggled back to draft from public — useful for curators who want to pull something temporarily. It disappears from feeds immediately.
- No intermediate "unlisted" state in this iteration — public or draft only.

~~~
Add `visibility: 'public' | 'draft'` to the sets table (default 'public'). Add `isDraft` filter to all set feed and search queries. The `publishSet(setId)` method flips visibility to 'public' and records a `publishedAt` timestamp — used for feed ordering so newly published sets surface correctly in On Rotation.
~~~
