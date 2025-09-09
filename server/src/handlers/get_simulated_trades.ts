import { db } from '../db';
import { simulatedTradesTable } from '../db/schema';
import { type SimulatedTrade } from '../schema';
import { desc } from 'drizzle-orm';

export const getSimulatedTrades = async (): Promise<SimulatedTrade[]> => {
  try {
    // Fetch all simulated trades ordered by execution time (most recent first)
    const results = await db.select()
      .from(simulatedTradesTable)
      .orderBy(desc(simulatedTradesTable.executed_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(trade => ({
      ...trade,
      quantity: parseFloat(trade.quantity),
      price: parseFloat(trade.price)
    }));
  } catch (error) {
    console.error('Failed to fetch simulated trades:', error);
    throw error;
  }
};