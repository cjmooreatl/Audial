// Helpers around auth — most app methods just need "is this user authenticated?"
// rather than RBAC role checks.

import { auth } from '@mindstudio-ai/agent';

export function requireAuth(): string {
  if (!auth.userId) {
    const err = new Error('Tune in to continue.');
    (err as any).code = 'not_authenticated';
    (err as any).status = 401;
    throw err;
  }
  return auth.userId;
}
