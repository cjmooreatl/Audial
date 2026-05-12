---
name: Transmissions
description: Know when your channel gets action — new subscribers, heavy spins on a set, a new set from a channel you're tuned to.
effort: medium
status: planned
---

Right now activity on Audial is silent. Someone tunes in to your channel and you never know. A set you compiled three months ago starts circulating and there's no signal. Transmissions is the notification layer — minimal, broadcast-coded, zero anxiety. Not a red-dot treadmill. More like a log of things worth knowing.

## What it looks like

- A `TRANSMISSIONS` entry in the user avatar dropdown (top-right nav). A small Ink dot appears on the avatar when there are unread transmissions.
- The Transmissions page (`/transmissions`) is a clean feed of events in reverse-chronological order — each entry is a single Mono-Label line:
  - `@curator TUNED IN ▪ 14:32 GMT`
  - `"Late Hours Vol. 3" — 47 spins this week ▪ MON`
  - `@curator BROADCAST "After Rain" ▪ WED 18:43 GMT` (new set from a channel you subscribe to)
- No avatars, no images, no card layouts. Just the log. Ink rules between entries.
- Optional email notifications: a single toggle in account settings to receive an email when a channel you subscribe to goes live (requires Private Sets + Go-Live to be meaningful, but the infrastructure is here).

## Key details

- Event types logged: `subscribed` (someone subscribes to your channel), `heavy_rotation` (a set of yours crosses a spin threshold — 25, 100, 500), `new_broadcast` (a channel you subscribe to publishes a new set).
- Transmissions are per-user, private. Nobody sees your notifications but you.
- The `heavy_rotation` event fires once per threshold per set — no repeated pings.
- Mark as read: visiting the Transmissions page marks all entries as read and clears the dot.
- No push notifications in this iteration — email and in-app only. Browser push is a future layer.
- The page is minimal by design. If it becomes a content feed or a social inbox, it's off-brand. Events, times, and nothing else.

~~~
A `transmissions` table: `id`, `recipientUserId`, `type`, `actorUserId` (nullable), `setId` (nullable), `readAt` (nullable), `createdAt`. Write events from `subscribe/unsubscribe`, `logSpin`, and `publishSet` methods. The `getTransmissions` method returns the latest 50 for the current user. For email: use the MindStudio email integration — send a plain-text digest email when `new_broadcast` events fire, batched with a short delay to avoid multiple emails for the same session.
~~~
