import { db } from '../db';
import { subscriptionsTable, tradersTable } from '../db/schema';
import { type Subscription } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getUserSubscriptions(userId: number): Promise<Subscription[]> {
  try {
    const results = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.subscriber_id, userId))
      .execute();

    return results.map(subscription => ({
      ...subscription,
      price_paid: parseFloat(subscription.price_paid)
    }));
  } catch (error) {
    console.error('Failed to fetch user subscriptions:', error);
    throw error;
  }
}

export async function getActiveSubscriptions(userId: number): Promise<Subscription[]> {
  try {
    const results = await db.select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.subscriber_id, userId),
          eq(subscriptionsTable.status, 'active')
        )
      )
      .execute();

    return results.map(subscription => ({
      ...subscription,
      price_paid: parseFloat(subscription.price_paid)
    }));
  } catch (error) {
    console.error('Failed to fetch active subscriptions:', error);
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: number): Promise<Subscription> {
  try {
    // First check if subscription exists and is active
    const existing = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, subscriptionId))
      .execute();

    if (existing.length === 0) {
      throw new Error('Subscription not found');
    }

    if (existing[0].status === 'cancelled') {
      throw new Error('Subscription is already cancelled');
    }

    // Update subscription to cancelled status and set end_date
    const results = await db.update(subscriptionsTable)
      .set({
        status: 'cancelled',
        end_date: new Date()
      })
      .where(eq(subscriptionsTable.id, subscriptionId))
      .returning()
      .execute();

    const subscription = results[0];
    return {
      ...subscription,
      price_paid: parseFloat(subscription.price_paid)
    };
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }
}