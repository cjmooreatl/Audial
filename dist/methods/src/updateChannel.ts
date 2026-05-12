import { Users, type CoSign } from './tables/users';
import { Sets } from './tables/sets';
import { requireAuth } from './common/auth';

const HANDLE_RE = /^[a-z0-9._]{3,20}$/;

// OKLCH-based luminosity check for accent color guardrails.
// We approximate luminosity from sRGB since we don't want a full OKLCH conversion lib.
// Returns 0..1 — values >0.85 are too bright on Bone.
function relativeLuminance(hex: string): number {
  const m = hex.replace('#', '').match(/^([a-f0-9]{6})$/i);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const adj = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * adj(r) + 0.7152 * adj(g) + 0.0722 * adj(b);
}

function validateAccent(hex: string): string | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return 'Accent must be a valid hex color.';
  if (relativeLuminance(hex) > 0.7) return 'Accent is too light for the bone surface.';
  // We skip the exact 8°-from-Heat hue check on the backend; the frontend picker
  // and presets enforce it more strictly.
  return null;
}

export async function updateChannel(input: {
  displayName?: string;
  handle?: string;
  notes?: string | null;
  accentColor?: string;
  avatarUrl?: string | null;
  featuredSetId?: string | null;
  coSigns?: CoSign[];
}) {
  const userId = requireAuth();

  const patch: Partial<{
    displayName: string;
    handle: string;
    notes: string | null;
    accentColor: string;
    avatarUrl: string | null;
    featuredSetId: string | null;
    coSigns: CoSign[];
  }> = {};

  if (input.displayName !== undefined) {
    const trimmed = input.displayName.trim();
    if (!trimmed) throw new Error('Display name is required.');
    patch.displayName = trimmed;
  }

  if (input.handle !== undefined) {
    const handle = input.handle.trim().toLowerCase();
    if (!HANDLE_RE.test(handle)) {
      throw new Error('Handle must be 3-20 characters: lowercase letters, numbers, dot, or underscore.');
    }
    const $ = { handle, userId }; // bindings: lifts closure var so filter compiles to SQL
    const existing = await Users.findOne(
      (u, $) => u.handle === $.handle && u.id !== $.userId,
      $,
    );
    if (existing) {
      const err = new Error('Handle is already in use.');
      (err as any).code = 'handle_taken';
      throw err;
    }
    patch.handle = handle;
  }

  if (input.notes !== undefined) {
    patch.notes = input.notes ? input.notes.trim().slice(0, 280) : null;
  }

  if (input.accentColor !== undefined) {
    const err = validateAccent(input.accentColor);
    if (err) throw new Error(err);
    patch.accentColor = input.accentColor;
  }

  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

  if (input.featuredSetId !== undefined) {
    if (input.featuredSetId) {
      const set = await Sets.get(input.featuredSetId);
      if (!set || set.ownerId !== userId) {
        throw new Error('Featured set must be one you compiled.');
      }
    }
    patch.featuredSetId = input.featuredSetId;
  }

  if (input.coSigns !== undefined) {
    patch.coSigns = input.coSigns.slice(0, 12);
  }

  const updated = await Users.update(userId, patch);
  return {
    channel: {
      id: updated.id,
      handle: updated.handle,
      displayName: updated.displayName,
      notes: updated.notes,
      accentColor: updated.accentColor,
      avatarUrl: updated.avatarUrl,
      featuredSetId: updated.featuredSetId,
      coSigns: updated.coSigns,
    },
  };
}
