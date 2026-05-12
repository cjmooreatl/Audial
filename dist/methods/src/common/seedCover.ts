// Brand seed cover images. Always reference these via the constants below
// rather than hardcoding URLs in scenario or method code.

const BASE = 'https://i.mscdn.ai/f67ecad1-beb0-4137-8dff-718c7e17656f/generated-images';

export const SEED_COVERS = {
  crowd: `${BASE}/99ae35e7-d191-4898-9dc3-0401ea519508.png`,
  riso: `${BASE}/c234c596-734e-4266-bf25-25546eede344.png`,
  brutalist: `${BASE}/f329051a-8035-4832-8d8d-7b328706925f.png`,
  laser: `${BASE}/7b2e2c54-9d8b-40a7-a7d5-e688166e51c3.png`,
  vinyl: `${BASE}/736c5f12-bdf6-42b2-91ae-b0520837f77a.png`,
  silhouette: `${BASE}/ef409b26-2dea-431c-93c4-7b12256597dd.png`,
} as const;

export type SeedCoverSlot = keyof typeof SEED_COVERS;

export const SEED_COVER_LIST = Object.entries(SEED_COVERS).map(([slot, url]) => ({
  slot: slot as SeedCoverSlot,
  url,
}));

// Deterministic seed-cover picker — given a string (e.g. set title), always
// returns the same cover. Used as a fallback when neither user-uploaded nor
// first-track-album cover are available.
export function seedCoverFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const slots = Object.values(SEED_COVERS);
  return slots[Math.abs(h) % slots.length];
}
