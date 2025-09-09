import { db } from '../db';
import { copyTradesTable, signalsTable, tradesTable, subscriptionsTable, usersTable } from '../db/schema';
import { type CopyTradeInput, type CopyTrade, type Trade } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function copyTrade(input: CopyTradeInput): Promise<CopyTrade> {
  try {
    // First verify that the signal exists and is active
    const signal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, input.signal_id))
      .execute();

    if (signal.length === 0) {
      throw new Error('Signal not found');
    }

    if (!signal[0].is_active) {
      throw new Error('Signal is no longer active');
    }

    // Verify the trader_id matches the signal's trader
    if (signal[0].trader_id !== input.trader_id) {
      throw new Error('Trader ID does not match signal trader');
    }

    // Verify that the subscriber user exists
    const subscriber = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.subscriber_id))
      .execute();

    if (subscriber.length === 0) {
      throw new Error('Subscriber user not found');
    }

    // Verify that the subscriber has an active subscription to this trader
    const subscription = await db.select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.subscriber_id, input.subscriber_id),
          eq(subscriptionsTable.trader_id, input.trader_id),
          eq(subscriptionsTable.status, 'active')
        )
      )
      .execute();

    if (subscription.length === 0) {
      throw new Error('No active subscription found for this trader');
    }

    // Create a new trade based on the signal
    const newTrade = await db.insert(tradesTable)
      .values({
        user_id: input.subscriber_id,
        symbol: signal[0].symbol,
        asset_type: signal[0].asset_type,
        trade_type: signal[0].signal_type,
        quantity: '1.00000000', // Default quantity for copied trades
        entry_price: signal[0].entry_price,
        status: 'executed'
      })
      .returning()
      .execute();

    // Create the copy trade record linking everything together
    const copyTradeResult = await db.insert(copyTradesTable)
      .values({
        subscriber_id: input.subscriber_id,
        trader_id: input.trader_id,
        signal_id: input.signal_id,
        copied_trade_id: newTrade[0].id,
        status: 'executed'
      })
      .returning()
      .execute();

    // Update the executed_at timestamp
    await db.update(copyTradesTable)
      .set({ executed_at: new Date() })
      .where(eq(copyTradesTable.id, copyTradeResult[0].id))
      .execute();

    // Return the copy trade with executed_at timestamp
    return {
      ...copyTradeResult[0],
      executed_at: new Date()
    };

  } catch (error) {
    console.error('Copy trade failed:', error);
    throw error;
  }
}

export async function getCopyTradeHistory(userId: number): Promise<CopyTrade[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const copyTrades = await db.select()
      .from(copyTradesTable)
      .where(eq(copyTradesTable.subscriber_id, userId))
      .execute();

    return copyTrades;

  } catch (error) {
    console.error('Get copy trade history failed:', error);
    throw error;
  }
}