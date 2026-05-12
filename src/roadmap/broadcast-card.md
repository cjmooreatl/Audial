---
name: Broadcast Card
description: Auto-generated shareable image cards for any set — built for Instagram, Twitter, and iMessage, designed to bring new listeners back to Audial.
effort: small
status: planned
---

Every time a great set gets shared right now, it's a link. Links don't stop thumbs. A Broadcast Card turns a set into an image: the cover art, the set title, the curator, and the AUDIAL▪ mark — all in the editorial aesthetic, ready to post anywhere. The image is the advertisement. The link is the door.

## What it looks like

- A `BROADCAST CARD` option in the set detail page's share menu (the share button in the top-right).
- Generates a 1080×1080 image (square, Instagram-native): the set's cover fills the background, a Bone-toned text block overlays the bottom third — set title in Clash Display, curator handle in mono, cut count and duration in Mono-Meta, and `AUDIAL▪` wordmark bottom-right in Signal.
- Also generates a 1200×630 variant (Open Graph standard) that becomes the automatic preview whenever an Audial set URL is shared in iMessage, Twitter, Slack, or any platform that renders link previews.
- One-tap download (saves the 1080×1080 to camera roll on mobile, downloads as PNG on desktop).
- The card is generated server-side so it's available immediately — no client-side canvas rendering.

## Key details

- The card is generated fresh on first request and cached (CDN-stored) with the set ID as the cache key. Regenerated if the set title, cover, or curator changes.
- The generated URL (`/cards/:setId.png`) is set as the `og:image` meta tag on every set detail page automatically — so link previews are rich everywhere without the user doing anything.
- Aspect ratio and typography adapt to long titles: if the title exceeds 40 chars, Clash Display scales down to fit in two lines maximum.
- The curator's accent color bleeds into the card's text block as a 4px top-rule above the title — connecting the card to the channel identity.

~~~
Server-side image generation via a headless canvas or puppeteer-equivalent (use the MindStudio `generateImage` action or a lightweight HTML-to-image approach with a Bone/Paper template). Store the generated PNG on the CDN via `platform.uploadFile`. Return the CDN URL. Set the URL as `ogImageUrl` on the set record for use in page metadata.
~~~
