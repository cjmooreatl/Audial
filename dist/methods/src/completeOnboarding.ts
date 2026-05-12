import { Users } from './tables/users';
import { requireAuth } from './common/auth';

const HANDLE_RE = /^[a-z0-9._]{3,20}$/;

export async function completeOnboarding(input: {
  handle: string;
  displayName: string;
  notes?: string;
  accentColor?: string;
}) {
  const userId = requireAuth();

  const handle = input.handle.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!HANDLE_RE.test(handle)) {
    throw new Error('Handle must be 3-20 characters: lowercase letters, numbers, dot, or underscore.');
  }
  if (!displayName) {
    throw new Error('Display name is required.');
  }

  // Check uniqueness — case-insensitive — exclude the current user (re-running onboarding).
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

  const updated = await Users.update(userId, {
    handle,
    displayName,
    notes: input.notes?.trim() || null,
    accentColor: input.accentColor || '#DCFF1A',
  });

  return {
    channel: {
      id: updated.id,
      handle: updated.handle,
      displayName: updated.displayName,
      notes: updated.notes,
      accentColor: updated.accentColor,
    },
  };
}
