import { db } from '@mindstudio-ai/agent';

export interface Subscription {
  subscriberId: string;
  channelId: string;
}

export const Subscriptions = db.defineTable<Subscription>('subscriptions', {
  unique: [['subscriberId', 'channelId']],
});
