import { db } from '../db';
import { signalsTable, subscriptionsTable, tradersTable } from '../db/schema';
import { type Signal } from '../schema';
import { eq, and, isNull, or, gte } from 'drizzle-orm';

export async function getUserSignals(userId: number): Promise<Signal[]> {
  try {
    // Get signals from traders the user is subscribed to
    const results = await db.select()
      .from(signalsTable)
      .innerJoin(subscriptionsTable, eq(signalsTable.trader_id, subscriptionsTable.trader_id))
      .where(
        and(
          eq(subscriptionsTable.subscriber_id, userId),
          eq(subscriptionsTable.status, 'active')
        )
      )
      .execute();

    // Convert numeric fields and return signals
    return results.map(result => ({
      ...(result as any).signals,
      entry_price: parseFloat((result as any).signals.entry_price),
      stop_loss: (result as any).signals.stop_loss ? parseFloat((result as any).signals.stop_loss) : null,
      take_profit: (result as any).signals.take_profit ? parseFloat((result as any).signals.take_profit) : null
    }));
  } catch (error) {
    console.error('Failed to fetch user signals:', error);
    throw error;
  }
}

export async function getActiveSignals(userId: number): Promise<Signal[]> {
  try {
    const now = new Date();
    
    // Get active (non-expired) signals from traders the user is subscribed to
    const results = await db.select()
      .from(signalsTable)
      .innerJoin(subscriptionsTable, eq(signalsTable.trader_id, subscriptionsTable.trader_id))
      .where(
        and(
          eq(subscriptionsTable.subscriber_id, userId),
          eq(subscriptionsTable.status, 'active'),
          eq(signalsTable.is_active, true),
          or(
            isNull(signalsTable.expires_at),
            gte(signalsTable.expires_at, now)
          )
        )
      )
      .execute();

    // Convert numeric fields and return signals
    return results.map(result => ({
      ...(result as any).signals,
      entry_price: parseFloat((result as any).signals.entry_price),
      stop_loss: (result as any).signals.stop_loss ? parseFloat((result as any).signals.stop_loss) : null,
      take_profit: (result as any).signals.take_profit ? parseFloat((result as any).signals.take_profit) : null
    }));
  } catch (error) {
    console.error('Failed to fetch active signals:', error);
    throw error;
  }
}

export async function getTraderSignals(traderId: number): Promise<Signal[]> {
  try {
    // Get all signals created by a specific trader
    const results = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.trader_id, traderId))
      .execute();

    // Convert numeric fields and return signals
    return results.map(signal => ({
      ...signal,
      entry_price: parseFloat(signal.entry_price),
      stop_loss: signal.stop_loss ? parseFloat(signal.stop_loss) : null,
      take_profit: signal.take_profit ? parseFloat(signal.take_profit) : null
    }));
  } catch (error) {
    console.error('Failed to fetch trader signals:', error);
    throw error;
  }
}