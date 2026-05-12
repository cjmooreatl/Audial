---
name: Drop Notes
description: Leave a short note on a set or on a specific cut — a place for listeners to annotate the experience in the curator's own language.
effort: medium
status: planned
---

Music people talk about music differently. They don't leave "Great playlist!" comments. They leave notes: a track reference, an association, a time and place. Drop Notes gives the community a place to do exactly that — terse, broadcast-coded, no threading, no algorithmic ranking. Just annotations on the record.

## What it looks like

- On the set detail page, a new section below the track list: `NOTES ▪ [count]`.
- A text input (Mono-Label style, Ink underline-only border): placeholder `Drop a note.` — 200 character max. Counter in mono bottom-right. `DROP` button on the right. Requires auth.
- Notes render as a numbered list below the input — `01`, `02`, `03` in mono, then the note text in Body weight, then `@handle ▪ [day]` in Mono-Meta.
- On the track list, individual tracks have a small `+ NOTE` affordance (visible on hover/tap) that opens an inline note input anchored to that track row — same mechanics, but the note is tagged to a specific cut. Track-level notes appear inline under the track row, collapsed by default (tap `NOTES` to expand).
- Set owner can delete any note on their set. Authors can delete their own. No editing after drop.

## Key details

- A `notes` table: `id`, `authorUserId`, `setId`, `trackIndex` (nullable — null = set-level, integer = track-level), `body`, `createdAt`.
- Notes are public. Anyone can read them. Only signed-in users can drop them.
- Character limit: 200. No links. No markdown. Plain text only — this isn't a comment box, it's a liner note.
- Notes count displayed on the set card (compact and hero variants) alongside marks and spins — `▪ 4 notes`.
- Moderation: set owners can delete notes. A `REPORT` action is hidden under a `...` menu on each note for future moderation tooling (for now, just stores the report for review).
- Drop Notes feeds into the Transmissions system: set owners get a transmission when a note is dropped on their set.

~~~
Add a `notes` table. The `dropNote(setId, body, trackIndex?)` method validates length and inserts. The `deleteNote(noteId)` method checks that caller is either note author or set owner. `getNotes(setId)` returns set-level and track-level notes. Denormalize `noteCount` onto the set row. On note creation, write a `note_dropped` transmission to the set owner.
~~~
