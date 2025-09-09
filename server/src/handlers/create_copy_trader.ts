import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type CreateCopyTraderInput, type CopyTrader } from '../schema';

export const createCopyTrader = async (input: CreateCopyTraderInput): Promise<CopyTrader> => {
  try {
    // Insert copy trader record
    const result = await db.insert(copyTradersTable)
      .values({
        name: input.name,
        trades_won: input.trades_won,
        trades_lost: input.trades_lost,
        followers: input.followers
      })
      .returning()
      .execute();

    // Return the created copy trader
    const copyTrader = result[0];
    return copyTrader;
  } catch (error) {
    console.error('Copy trader creation failed:', error);
    throw error;
  }
};