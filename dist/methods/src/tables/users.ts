import { db } from '@mindstudio-ai/agent';

export interface CoSign {
  itunesArtistId: number;
  name: string;
  imageUrl: string;
}

export interface User {
  // Auth-managed columns (read-only from code)
  email: string;
  roles: string[];

  // Audial channel data — all nullable until onboarding completes
  handle: string | null;
  displayName: string | null;
  notes: string | null;
  accentColor: string;
  featuredSetId: string | null;
  coSigns: CoSign[];
  avatarUrl: string | null;
}

export const Users = db.defineTable<User>('users', {
  unique: [['handle']],
  defaults: {
    accentColor: '#DCFF1A',
    coSigns: [],
    handle: null,
    displayName: null,
    notes: null,
    featuredSetId: null,
    avatarUrl: null,
  },
});
// touch
