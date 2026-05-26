import { supabase } from '../lib/supabase';

export async function getChannel(handle: string) {
  // 1. Get the user by handle
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .single();

  if (userError || !user) throw new Error('Channel not found.');

  const ownerId = user.id;

  // 2. Get sets owned by this user
  const { data: sets } = await supabase
    .from('sets')
    .select('*')
    .eq('ownerId', ownerId)
    .order('created_at', { ascending: false });

  // 3. Count subscriptions
  const { count: tunedIn } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('channelId', ownerId);

  const { count: tunedTo } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('subscriberId', ownerId);

  return {
    channel: {
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      notes: user.notes,
      coSigns: user.coSigns,
      featuredSetId: user.featuredSetId,
      counts: {
        sets: sets?.length ?? 0,
        tunedIn,
        tunedTo,
      },
    },
    sets: sets ?? [],
  };
}
