// A set's playlist link can point anywhere (Spotify, Apple Music, YouTube,
// SoundCloud, ...) so this only checks that it's a well-formed absolute URL —
// no domain restriction, unlike the per-platform checks in LinksModal.
export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}
