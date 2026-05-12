---
name: Collaborative Sets
description: Two or more curators compile a set together — co-credited, co-owned, and broadcast simultaneously on every contributor's channel.
effort: large
status: planned
---

The best sets are often arguments between people with taste. Collaborative sets make that argument visible. Two curators compile a set together: they both file tracks, both see each other's additions, both have their handles on the cover. The finished set broadcasts on every contributor's channel at once. It's a new kind of content object — not one person's statement, but a recorded conversation.

## What it looks like

- In the Compile a Set modal, a new `+ INVITE COLLABORATOR` field below the description — search by handle. Add up to 3 collaborators. They each receive an invite via Transmissions.
- Once accepted, the set appears in each collaborator's channel with a co-credits line: `compiled by @handle1, @handle2` in Mono-Meta.
- Any collaborator can add and reorder tracks in the set. A small `@handle ▪ time` mono attribution appears on each track row showing who filed it.
- The set has a shared live editing state: when a collaborator is actively in the set, a small `@handle / EDITING` Mono-Label pulses at the top of the track list — no conflict resolution needed for MVP, last-write-wins on track order.
- The set detail page gets a `CO-COMPILED` Mono-Label badge at the top, and the curator attribution section shows all contributors as a horizontal strip of avatars with handles.
- Going live (`GO LIVE`) requires confirmation from all collaborators — or the set owner can force-publish after 48 hours.

## Key details

- A `setCollaborators` join table: `setId`, `userId`, `inviteStatus` (`pending` / `accepted` / `declined`), `joinedAt`.
- Collaborator permissions: add tracks, reorder, edit description. Cannot delete the set (owner only), cannot change the cover (owner only), cannot remove other collaborators (owner only).
- The set appears on each accepted collaborator's channel under `04 / IN ROTATION` and is eligible for their Featured Set. It counts toward all collaborators' compiled set counts.
- Invites can be declined or accepted from the Transmissions page. Pending invites show the set in a `PENDING` state on the invitee's channel with a `CONFIRM` / `DECLINE` inline action.
- If a collaborator leaves the set or is removed, their name is removed from the credits. Tracks they filed remain — only the attribution tag on the track row is cleared.
- Spin counts are attributed to the set, not to individual collaborators. On the Transmissions system, all collaborators receive spin milestone notifications for the shared set.

~~~
Add `setCollaborators` table. Modify `getSet`, `updateSet`, and `addTrackToSet` methods to check collaborator membership. The `inviteCollaborator(setId, handle)` method creates a pending entry and writes an invitation transmission. `respondToCollaboratorInvite(setId, response)` updates status. Filter `getHomeFeed` and `getChannelSets` to include sets where the user is an accepted collaborator. Track filings by collaborators should store `filedByUserId` on the track entry within the JSON array.
~~~
