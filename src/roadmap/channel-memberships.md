---
name: Channel Memberships
description: Listeners support their favorite curators with a monthly membership — unlocking private sets, early access, and a supporter badge on their channel.
effort: large
status: planned
---

The best curators on Audial are doing real editorial work. They deserve a business model. Channel Memberships lets listeners pay a curator directly — a monthly subscription that unlocks private sets, early access to new broadcasts, and a visible supporter badge. No platform algorithm in the middle. No advertising. Just taste, directly compensated.

## What it looks like

- Curators opt into memberships via their Edit Channel settings. They set a price (minimum $3/month, up to $20/month) and write a short membership pitch in the voice: `What members get.` — a 140-character statement.
- On a channel page with memberships enabled, a new action button: `SUPPORT THIS CHANNEL — $X/MO`. Ink-bordered, prominent. Below it, the curator's membership pitch in Mono-Meta.
- Members see a small `SUPPORTER` Mono-Label badge on their own avatar wherever it appears on the channel — on notes, on the subscriber list, on the channel masthead if they subscribe.
- Curator-only features unlocked by membership:
  - **Members-only sets**: a new visibility option on sets — `MEMBERS ONLY`. These sets appear on the channel page with a `MEMBERS` badge but are only fully accessible to paying members.
  - **Early access**: curators can set a `releaseAt` date on a set, making it members-only until that date, then public.
  - **Direct message**: members can send one message per week to the curator. The curator sees these in a `SUPPORTER MAIL` section in their Transmissions.
- Curators see a `MEMBERSHIP REPORT` section in their Signal Report: revenue, active member count, churn.

## Key details

- Payments via Stripe. Audial takes a 10% platform fee; 90% goes to the curator. Stripe handles tax and compliance.
- Membership is per-channel, not per-platform. Subscribing to a channel does not give you a membership — the two actions are separate.
- Membership cancellation is immediate; access to members-only sets reverts at end of the billing period.
- Creators must complete Stripe identity verification (KYC) before memberships can be enabled on their channel. This is handled via Stripe Connect's Express account flow.
- The `SUPPORTER` badge is tied to an active billing relationship. If a membership lapses, the badge disappears.
- Audial's own channel (the seeded editorial account) can use memberships to model the behavior for new curators.

~~~
Stripe Connect for curator payouts. Add `membershipEnabled`, `membershipPriceUsd`, `membershipPitch`, `stripeAccountId` to the user record. A `memberships` table: `subscriberUserId`, `channelUserId`, `stripeSubscriptionId`, `status`, `currentPeriodEnd`. The `createMembership(channelUserId)` method initiates a Stripe Checkout session. A webhook handler at `/webhooks/stripe` processes subscription events (created, updated, deleted) and updates the memberships table. Add `visibility: 'public' | 'draft' | 'members'` to the sets table (extending the Private Sets feature). Gate `getSet` and feed queries behind membership check for `members`-visibility sets.
~~~
