import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type CopyTrader } from '../schema';
import { desc } from 'drizzle-orm';

export const getCopyTraders = async (): Promise<CopyTrader[]> => {
  try {
    // Fetch up to 10 copy traders, ordered by number of followers (descending)
    const results = await db.select()
      .from(copyTradersTable)
      .orderBy(desc(copyTradersTable.followers))
      .limit(10)
      .execute();

    // No numeric conversions needed - all fields are integers or strings
    return results;
  } catch (error) {
    console.error('Failed to fetch copy traders:', error);
    throw error;
  }
};