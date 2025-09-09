import { db } from '../db';
import { subscriptionsTable, usersTable, tradersTable } from '../db/schema';
import { type CreateSubscriptionInput, type Subscription } from '../schema';
import { eq } from 'drizzle-orm';

export const createSubscription = async (input: CreateSubscriptionInput): Promise<Subscription> => {
  try {
    // Validate subscriber exists
    const subscribers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.subscriber_id))
      .execute();

    if (subscribers.length === 0) {
      throw new Error('Subscriber not found');
    }

    // Validate trader exists
    const traders = await db.select()
      .from(tradersTable)
      .where(eq(tradersTable.id, input.trader_id))
      .execute();

    if (traders.length === 0) {
      throw new Error('Trader not found');
    }

    const subscriber = subscribers[0];
    const trader = traders[0];

    // Validate subscriber has sufficient balance
    const subscriberBalance = parseFloat(subscriber.virtual_balance);
    if (subscriberBalance < input.price_paid) {
      throw new Error('Insufficient balance');
    }

    // Check if subscriber can afford the trader's subscription price
    const traderPrice = parseFloat(trader.subscription_price);
    if (input.price_paid < traderPrice) {
      throw new Error('Price paid is less than trader subscription price');
    }

    // Create subscription record
    const result = await db.insert(subscriptionsTable)
      .values({
        subscriber_id: input.subscriber_id,
        trader_id: input.trader_id,
        price_paid: input.price_paid.toString()
      })
      .returning()
      .execute();

    // Deduct subscription fee from subscriber's balance
    const newBalance = subscriberBalance - input.price_paid;
    await db.update(usersTable)
      .set({
        virtual_balance: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.subscriber_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    const subscription = result[0];
    return {
      ...subscription,
      price_paid: parseFloat(subscription.price_paid)
    };
  } catch (error) {
    console.error('Subscription creation failed:', error);
    throw error;
  }
};