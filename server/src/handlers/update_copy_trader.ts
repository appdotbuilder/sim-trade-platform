import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type UpdateCopyTraderInput, type CopyTrader } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCopyTrader(input: UpdateCopyTraderInput): Promise<CopyTrader> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof copyTradersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.trades_won !== undefined) {
      updateData.trades_won = input.trades_won;
    }
    if (input.trades_lost !== undefined) {
      updateData.trades_lost = input.trades_lost;
    }
    if (input.followers !== undefined) {
      updateData.followers = input.followers;
    }

    // Update the copy trader
    const result = await db.update(copyTradersTable)
      .set(updateData)
      .where(eq(copyTradersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Copy trader with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Copy trader update failed:', error);
    throw error;
  }
}