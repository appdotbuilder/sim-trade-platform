import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteCopyTrader = async (input: DeleteByIdInput): Promise<{ success: boolean }> => {
  try {
    // Check if copy trader exists before deletion
    const existingTrader = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, input.id))
      .execute();

    if (existingTrader.length === 0) {
      throw new Error(`Copy trader with id ${input.id} not found`);
    }

    // Delete the copy trader
    await db.delete(copyTradersTable)
      .where(eq(copyTradersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Copy trader deletion failed:', error);
    throw error;
  }
};