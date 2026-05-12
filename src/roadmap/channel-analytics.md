---
name: Signal Report
description: A private analytics dashboard for your channel — spins, subscriber growth, top-performing sets, and where your listeners are coming from.
effort: medium
status: planned
---

Curators on Audial are putting real editorial work into the world. Right now they have no way to know if it's landing — no data, no signal, no feedback loop beyond the spin count on a set card. The Signal Report is a private dashboard that answers the only questions that matter: what's resonating, who's listening, and where they found it.

## What it looks like

- Accessible via `SIGNAL REPORT` in the avatar dropdown — or at `/c/me/signal`. Private to the channel owner only.
- A clean, print-flavored analytics page. No charts with curved lines, no pastel dashboards. Bar rules for relative scale, mono numbers for counts. Everything in Ink and Bone.
- Top section: key numbers in a four-column strip — `[N] total spins`, `[N] tuned in`, `[N] sets compiled`, `[N] marks this week`. Each number in large Clash Display, label below in Mono-Meta.
- Below: `TOP SETS THIS WEEK` — a ranked list of your sets by spin count in the last 7 days. Each row: rank number (mono), set cover (32×32), title, spin count, mark count, and a bar graph (1px Ink, width proportional to the top set).
- Below: `TUNED IN / LAST 30 DAYS` — subscriber growth as a simple bar chart (one bar per day, Ink-filled, proportional to max). New subscribers each day shown on hover.
- Below: `WHERE THEY'RE COMING FROM` — a breakdown of spin source types: `THE WIRE`, `CHANNEL PAGE`, `SET DETAIL`, `EMBED`. Shown as a list with percentage breakdowns.
- Below: `YOUR HEAVY ROTATION HISTORY` — a timeline of your sets ranked by all-time spins, descending.

## Key details

- All data is derived from the existing `spins` table. No new tracking required beyond what MVP already logs.
- The dashboard is built from two or three aggregate backend queries — not real-time, refreshed every hour and cached.
- Embed spin attribution: spins logged from embeds include a `source: 'embed'` field — this feeds the "where they're coming from" breakdown.
- No public profile analytics. A curator's spin counts remain private to them — set cards show spin counts as a social signal, but the granular data behind them is theirs alone.
- Data retention: all-time data is available from the day a user joined. No data windowing.

~~~
A `getSignalReport(userId)` method that runs aggregate queries: spins grouped by setId (last 7 days), subscribers added per day (last 30 days), spins grouped by source type (all time). Cache the result with a 1-hour TTL per user. The `spins` table needs a `source` column added to track Wire vs channel vs embed vs direct. A new `/c/me/signal` route in the web interface renders the `SignalReport` page component, gated by `auth.requireRole('user')` on the backend.
~~~
