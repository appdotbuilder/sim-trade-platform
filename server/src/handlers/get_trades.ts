import { db } from '../db';
import { tradesTable } from '../db/schema';
import { type Trade } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getUserTrades(userId: number): Promise<Trade[]> {
  try {
    const trades = await db.select()
      .from(tradesTable)
      .where(eq(tradesTable.user_id, userId))
      .orderBy(desc(tradesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return trades.map(trade => ({
      ...trade,
      quantity: parseFloat(trade.quantity),
      entry_price: parseFloat(trade.entry_price),
      exit_price: trade.exit_price ? parseFloat(trade.exit_price) : null,
      profit_loss: trade.profit_loss ? parseFloat(trade.profit_loss) : null
    }));
  } catch (error) {
    console.error('Failed to get user trades:', error);
    throw error;
  }
}

export async function getTradeHistory(userId: number, limit?: number): Promise<Trade[]> {
  try {
    const baseQuery = db.select()
      .from(tradesTable)
      .where(eq(tradesTable.user_id, userId))
      .orderBy(desc(tradesTable.created_at));

    // Apply limit if provided
    const query = limit ? baseQuery.limit(limit) : baseQuery;
    const trades = await query.execute();

    // Convert numeric fields back to numbers
    return trades.map(trade => ({
      ...trade,
      quantity: parseFloat(trade.quantity),
      entry_price: parseFloat(trade.entry_price),
      exit_price: trade.exit_price ? parseFloat(trade.exit_price) : null,
      profit_loss: trade.profit_loss ? parseFloat(trade.profit_loss) : null
    }));
  } catch (error) {
    console.error('Failed to get trade history:', error);
    throw error;
  }
}

export async function getActiveTrades(userId: number): Promise<Trade[]> {
  try {
    const trades = await db.select()
      .from(tradesTable)
      .where(and(
        eq(tradesTable.user_id, userId),
        eq(tradesTable.status, 'executed')
      ))
      .orderBy(desc(tradesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return trades.map(trade => ({
      ...trade,
      quantity: parseFloat(trade.quantity),
      entry_price: parseFloat(trade.entry_price),
      exit_price: trade.exit_price ? parseFloat(trade.exit_price) : null,
      profit_loss: trade.profit_loss ? parseFloat(trade.profit_loss) : null
    }));
  } catch (error) {
    console.error('Failed to get active trades:', error);
    throw error;
  }
}