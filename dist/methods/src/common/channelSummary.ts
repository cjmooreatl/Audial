// Compact channel summary used in feed cards, set details, search results, etc.
// Avoids leaking auth-managed fields like email/roles.

import type { User } from '../tables/users';

export interface ChannelSummary {
  id: string;
  handle: string;
  displayName: string;
  accentColor: string;
  avatarUrl: string | null;
}

export function summarizeChannel(
  user: User & { id: string },
): ChannelSummary {
  return {
    id: user.id,
    handle: user.handle ?? 'unknown',
    displayName: user.displayName ?? 'Unknown',
    accentColor: user.accentColor,
    avatarUrl: user.avatarUrl,
  };
}
