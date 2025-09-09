import { db } from '../db';
import { signalsTable, tradersTable } from '../db/schema';
import { type CreateSignalInput, type Signal } from '../schema';
import { eq } from 'drizzle-orm';

export const createSignal = async (input: CreateSignalInput): Promise<Signal> => {
  try {
    // Verify that the trader exists
    const trader = await db.select()
      .from(tradersTable)
      .where(eq(tradersTable.id, input.trader_id))
      .execute();

    if (trader.length === 0) {
      throw new Error('Trader not found');
    }

    // Insert signal record
    const result = await db.insert(signalsTable)
      .values({
        trader_id: input.trader_id,
        symbol: input.symbol,
        asset_type: input.asset_type,
        signal_type: input.signal_type,
        entry_price: input.entry_price.toString(), // Convert number to string for numeric column
        stop_loss: input.stop_loss ? input.stop_loss.toString() : null,
        take_profit: input.take_profit ? input.take_profit.toString() : null,
        description: input.description || null,
        expires_at: input.expires_at || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const signal = result[0];
    return {
      ...signal,
      entry_price: parseFloat(signal.entry_price),
      stop_loss: signal.stop_loss ? parseFloat(signal.stop_loss) : null,
      take_profit: signal.take_profit ? parseFloat(signal.take_profit) : null
    };
  } catch (error) {
    console.error('Signal creation failed:', error);
    throw error;
  }
};