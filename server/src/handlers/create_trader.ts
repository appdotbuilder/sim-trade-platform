import { db } from '../db';
import { tradersTable, usersTable } from '../db/schema';
import { type CreateTraderInput, type Trader } from '../schema';
import { eq } from 'drizzle-orm';

export const createTrader = async (input: CreateTraderInput): Promise<Trader> => {
  try {
    // First verify that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if user already has a trader profile
    const existingTrader = await db.select()
      .from(tradersTable)
      .where(eq(tradersTable.user_id, input.user_id))
      .execute();

    if (existingTrader.length > 0) {
      throw new Error(`User ${input.user_id} already has a trader profile`);
    }

    // Insert trader record
    const result = await db.insert(tradersTable)
      .values({
        user_id: input.user_id,
        display_name: input.display_name,
        bio: input.bio || null,
        subscription_price: input.subscription_price.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const trader = result[0];
    return {
      ...trader,
      profit_percentage: parseFloat(trader.profit_percentage), // Convert string back to number
      win_rate: parseFloat(trader.win_rate), // Convert string back to number
      subscription_price: parseFloat(trader.subscription_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Trader creation failed:', error);
    throw error;
  }
};