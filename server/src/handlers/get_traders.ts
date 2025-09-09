import { db } from '../db';
import { tradersTable } from '../db/schema';
import { type Trader } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getAvailableTraders(): Promise<Trader[]> {
  try {
    const results = await db.select()
      .from(tradersTable)
      .where(eq(tradersTable.is_active, true))
      .orderBy(desc(tradersTable.total_followers))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(trader => ({
      ...trader,
      profit_percentage: parseFloat(trader.profit_percentage),
      win_rate: parseFloat(trader.win_rate),
      subscription_price: parseFloat(trader.subscription_price)
    }));
  } catch (error) {
    console.error('Failed to fetch available traders:', error);
    throw error;
  }
}

export async function getTraderById(traderId: number): Promise<Trader | null> {
  try {
    const results = await db.select()
      .from(tradersTable)
      .where(eq(tradersTable.id, traderId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const trader = results[0];
    return {
      ...trader,
      profit_percentage: parseFloat(trader.profit_percentage),
      win_rate: parseFloat(trader.win_rate),
      subscription_price: parseFloat(trader.subscription_price)
    };
  } catch (error) {
    console.error('Failed to fetch trader by ID:', error);
    throw error;
  }
}

export async function getTopTraders(limit: number = 10): Promise<Trader[]> {
  try {
    const results = await db.select()
      .from(tradersTable)
      .where(
        and(
          eq(tradersTable.is_active, true)
        )
      )
      .orderBy(
        desc(tradersTable.profit_percentage),
        desc(tradersTable.win_rate),
        desc(tradersTable.total_followers)
      )
      .limit(limit)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(trader => ({
      ...trader,
      profit_percentage: parseFloat(trader.profit_percentage),
      win_rate: parseFloat(trader.win_rate),
      subscription_price: parseFloat(trader.subscription_price)
    }));
  } catch (error) {
    console.error('Failed to fetch top traders:', error);
    throw error;
  }
}