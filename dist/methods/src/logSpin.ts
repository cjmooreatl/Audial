import { Spins } from './tables/spins';
import { requireAuth } from './common/auth';

export async function logSpin(input: {
  setId: string;
  trackItunesId?: number;
}) {
  const userId = requireAuth();
  await Spins.push({
    userId,
    setId: input.setId,
    trackItunesId: input.trackItunesId ?? null,
  });
  return { logged: true };
}
