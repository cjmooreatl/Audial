---
name: Marks
description: Leave a quick mark on any set — a single intentional gesture that says something landed, visible as a count on every set card.
effort: quick
status: planned
---

A spin is passive — it records that you listened. A mark is intentional. It's not a heart, not a star, not a thumbs-up. It's closer to a notch: you were here, this registered. Marks are visible as a count on set cards and on the set detail page. They feed into On Rotation scoring as a weak signal of deliberate approval.

## What it looks like

- On every set card, a small mono count to the right of the spin count: `▪ 12 marks`. Initially zero, not shown until at least 1.
- On the set detail page: a `MARK` button next to `PLAY ALL`. Ink-bordered, Mono-Label. On click: button label flashes to `MARKED ▪` for 1.4s, the count increments. Second click un-marks (toggles). Marking requires auth.
- The mark is not a reaction selector (no emoji, no emotion palette). One mark per user per set. No breakdown of who marked.
- Marks from anonymous users are not possible — the CTA for anonymous viewers is greyed with `Tune in to mark.` on hover.

## Key details

- A `marks` table: `userId`, `setId`, `createdAt`. Unique constraint on `(userId, setId)`.
- Mark count is denormalized onto the set row (`markCount`) and updated on mark/unmark.
- On Rotation scoring: marks count as approximately 0.5x a spin in the weekly ranking formula. Enough to matter, not enough to be gamed.
- No notifications for marks in this iteration — marks are ambient, not social transactions.
- Mark counts display on: compact card (below title, mono-meta), hero card (same row as cuts + duration), and set detail page.

~~~
Add `markCount` integer (default 0) to sets table. The `markSet(setId)` method inserts into `marks` and increments; `unmarkSet` deletes and decrements. Both are idempotent. Return the new mark count in the response. Update `getHomeFeed` score computation to incorporate mark weight.
~~~
