import { db } from '@mindstudio-ai/agent';

export interface Spin {
  userId: string;
  setId: string;
  trackItunesId: number | null;
}

export const Spins = db.defineTable<Spin>('spins', {
  defaults: {
    trackItunesId: null,
  },
});
