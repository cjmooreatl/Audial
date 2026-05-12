---
name: Colors
type: design/color
---

```colors
Bone:
  value: "#F2EEE3"
  description: Primary surface. Warm cream paper, the canvas for everything. Never pure white — pure white feels clinical and tech, bone feels printed and considered.
Paper:
  value: "#FAF7EE"
  description: Elevated surface. Cards, sheets, modals. One half-shade lighter than Bone, just enough to register as raised without using shadow.
Ink:
  value: "#0F0E0C"
  description: Primary text, rules, dividers, and the wordmark. Slightly warm near-black, never pure #000 — pure black on cream looks digital, warm ink looks printed.
Smoke:
  value: "#6B665C"
  description: Secondary text, metadata labels, inactive states. A warm mid-gray that lives in the same family as Bone and Ink.
Mist:
  value: "#C9C3B5"
  description: Hairline rules, disabled elements, skeletons. The lightest functional value above Bone.
Signal:
  value: "#DCFF1A"
  description: The brand accent. Electric chartreuse — the only saturated color in the system. Used for Audial's own moments (the wordmark dot, the home tab indicator, the radio "On Air" pulse, the primary CTA fill on neutral pages). Disappears on user profile pages, replaced by the user's accent.
Heat:
  value: "#FF3B2E"
  description: Destructive/alert only. Vermillion red. Used for delete confirmations, "remove from set," errors. Rare by design.
```

## Derivation rules

- Borders and dividers: always `Ink` at full opacity, 1px. Never gray-tone borders. Use `Mist` for the lightest functional rule, `Ink` for everything else.
- Surface elevation: shift from `Bone` to `Paper`. No shadows.
- Text on photographic backgrounds (cover art): use `Bone`, never pure white.
- Hover state on neutral surfaces: shift the surface to `Paper`. No shadow, no scale.
- For OKLCH derivations of any color, transform from the source variable: `oklch(from var(--ink) calc(l + 0.5) c h)` etc.

## Signal usage rules

- `Signal` (chartreuse) must never sit below 18px text on Bone — contrast ratio fails at small sizes. For small-format use it works as a fill block ≥ 8px tall (the wordmark terminator dot, badges, the on-air pulse), never as small text.
- The system uses `Signal` only when no user accent is in scope. When the viewer is on someone's channel, `Signal` is replaced by that channel owner's accent color throughout the page.

## User accent guardrails

When a user picks an accent for their channel, the system enforces:

1. Reject anything with luminosity > 0.85 in OKLCH (would be invisible on Bone).
2. Reject anything within 8° hue of `Heat` (#FF3B2E) — destructive/alert color must remain unique.
3. Auto-derive an "accent-on-text" variant when the picked color is too light: if L > 0.55, darken to L=0.35 for text-mode use; otherwise use as-is.
4. Provide ~18 curated preset swatches (risograph-coded: oxblood, cobalt, sulfur yellow, tangerine, jade, charcoal, dusty rose, etc.), all guaranteed to pass these checks. A custom hex picker is available below the preset strip for advanced users.

~~~
The presets and validation logic should live in a single brand utility module on the frontend (e.g., `dist/interfaces/web/src/brand/accent.ts`) that exports the preset list and a `validateAccent(hex)` function. The preset hex list:

```
#7A1F1F  oxblood
#1E3A8A  cobalt
#C29B0C  sulfur
#E07A2A  tangerine
#0F6B4F  jade
#2A2A26  charcoal
#B8849C  dusty rose
#6E4DCF  iris
#8DA635  moss
#1F3A36  pine
#A8480F  rust
#0E5A6E  teal
#915C2D  umber
#3F1F5C  blackcurrant
#9C2641  amaranth
#3D5A1F  olive
#5C2D2D  bordeaux
#0E0E0E  near-black
```

These are the source of truth. If the user picks custom, run validation; if invalid, surface an inline mono-label error: "TOO LIGHT — TRY DARKER" or "TOO CLOSE TO ALERT — TRY ANOTHER HUE".
~~~
