// Editorial phrases for the masthead. Picked deterministically per day.

export const MASTHEAD_PHRASES: { html: string; emph: string }[] = [
  { html: 'Heavy weather, late hours, ::cracked:: basements.', emph: 'cracked' },
  { html: 'Every set tells you ::who:: someone is.', emph: 'who' },
  { html: 'Quiet rooms, ::loud:: taste.', emph: 'loud' },
  { html: 'Drift the schedule. ::Subscribe:: to a voice.', emph: 'Subscribe' },
  { html: 'Compile what you ride for. ::Broadcast:: it.', emph: 'Broadcast' },
  { html: 'Catalogues kept by ::strangers:: with taste.', emph: 'strangers' },
  { html: 'The ::wire:: is live. The crate is open.', emph: 'wire' },
];

export function phraseForToday(): { before: string; emph: string; after: string } {
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const p = MASTHEAD_PHRASES[day % MASTHEAD_PHRASES.length];
  const [before, after] = p.html.split('::' + p.emph + '::');
  return { before, emph: p.emph, after };
}

// Section themes per tab — picked deterministically per index.
export const SECTION_THEMES: Record<string, string[]> = {
  'on-rotation': ['BROADCASTING NOW', 'RIDING HIGH', 'PEAK HOURS', 'ON THE DIAL'],
  'heavy-rotation': ['CRATE STAPLES', 'FILED & FILED AGAIN', 'WORN GROOVES', 'IN HEAVY ROTATION'],
  drift: ['AT RANDOM', 'OFF THE SCHEDULE', 'DRIFT MODE', 'BETWEEN STATIONS'],
  subscribed: ['FROM YOUR CHANNELS', 'ON YOUR DIAL', 'SUBSCRIBED THIS WEEK'],
};

export function sectionThemeFor(tab: string, idx: number): string {
  const themes = SECTION_THEMES[tab] ?? SECTION_THEMES['on-rotation'];
  return themes[idx % themes.length];
}

export function issueNumber(): number {
  // Day-since-epoch + 100 — feels like a real publication's issue count.
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return day - 19000 + 100; // ~Jan 2022 → ISSUE 100, scales from there.
}
