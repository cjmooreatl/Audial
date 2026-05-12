---
name: Typography
type: design/typography
---

```typography
fonts:
  Clash Display:
    src: https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap
  Inter:
    src: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
  Geist Mono:
    src: https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap

styles:
  Display-XL:
    font: Clash Display
    size: 128px
    weight: 700
    letterSpacing: -0.045em
    lineHeight: 0.9
    case: ordinary
    description: Editorial moments — masthead on home, profile display name when viewed full-bleed. One element per screen, max.
  Display:
    font: Clash Display
    size: 72px
    weight: 600
    letterSpacing: -0.035em
    lineHeight: 0.95
    case: ordinary
    description: Page titles, hero headings, profile names. Set tight, set big, never apologize for the scale.
  Heading:
    font: Clash Display
    size: 28px
    weight: 600
    letterSpacing: -0.02em
    lineHeight: 1.05
    description: Section titles, set titles in feed cards, modal headers.
  Subhead:
    font: Clash Display
    size: 20px
    weight: 500
    letterSpacing: -0.015em
    lineHeight: 1.2
    description: Set titles inside compact cards, list-row primary text.
  Body:
    font: Inter
    size: 15px
    weight: 400
    lineHeight: 1.5
    description: Default reading text — bios (notes), descriptions, prose.
  UI:
    font: Inter
    size: 14px
    weight: 500
    lineHeight: 1.4
    description: Buttons, inputs, navigation, interactive labels.
  Caption:
    font: Inter
    size: 13px
    weight: 400
    lineHeight: 1.4
    description: Secondary microcopy, hints. Not for numeric metadata.
  Mono-Label:
    font: Geist Mono
    size: 11px
    weight: 500
    letterSpacing: 0.12em
    case: uppercase
    description: Section labels, broadcast metadata, "ON AIR" indicators, tab labels. The NTS-coded voice of the system.
  Mono-Meta:
    font: Geist Mono
    size: 12px
    weight: 400
    description: Track durations, timestamps, track numbers (01, 02...), BPM, follower counts, "added 2d ago" — every numeric/data string.
```

## Type rules

These are not optional, they are the system:

1. **Numbers always set in Geist Mono.** Track counts, durations (`3:42`), follower counts, dates, BPM. The visual rhythm of mono numbers next to grotesque labels is the entire aesthetic. Never set a number in Inter.
2. **Section labels are always Mono-Label, all caps, tracked +0.12em.** Format: `[two-digit-number] / [LABEL]`. Examples: `01 / SUBSCRIBED`, `02 / ON ROTATION`, `03 / HEAVY ROTATION`, `04 / DRIFT`. The number prefix is part of the system, not optional.
3. **Display type ignores the grid.** Big titles bleed past container padding when it serves the composition. Don't constrain `Display-XL` to safe gutters.
4. **Never mix Display weights on the same screen.** Pick 600 or 700 and commit. Mixing reads as indecisive.
5. **Italics: Inter italic only, sparingly.** Used for guest-host attributions and quoted titles. Never italicize Clash Display or Geist Mono.

## The wordmark

The Audial wordmark is typeset in code, not a static logo asset. The mark reads `AUDIAL▪` — wordmark in Clash Display, weight 700, all caps, tracked tight, followed by a small chartreuse square sitting at the baseline. The square is the brand's broadcast indicator: a record's center hole abstracted, a printed publication's terminator, a live signal indicator.

~~~
The exact wordmark CSS — implement once as a reusable component:

```css
.wordmark {
  font-family: 'Clash Display', sans-serif;
  font-weight: 700;
  font-size: 28px;          /* scales for context — adjust per usage */
  letter-spacing: -0.05em;
  text-transform: uppercase;
  color: var(--ink);
  display: inline-flex;
  align-items: baseline;
  line-height: 1;
}
.wordmark::after {
  content: '';
  display: inline-block;
  width: 0.32em;
  height: 0.32em;
  background: var(--signal);
  margin-left: 0.18em;
  align-self: flex-end;
  margin-bottom: 0.04em;
}
```

When the app is "live" — the global audio context is playing — the chartreuse block pulses opacity 1 → 0.4 → 1 over 1.6s, ease-in-out, infinite. Otherwise it sits still. Drive this from a global "isAudioActive" state, not per-component.

In contexts where the wordmark is rendered on Ink (e.g., the now-playing bar's brand corner), invert: `color: var(--bone)`, the block stays Signal.
~~~
