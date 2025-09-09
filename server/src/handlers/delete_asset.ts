import { db } from '../db';
import { assetsTable, signalsTable, simulatedTradesTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteAsset(input: DeleteByIdInput): Promise<{ success: boolean }> {
  try {
    // First, check if the asset exists
    const existingAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.id))
      .execute();

    if (existingAsset.length === 0) {
      throw new Error(`Asset with id ${input.id} not found`);
    }

    // Delete related signals first (cascade deletion)
    await db.delete(signalsTable)
      .where(eq(signalsTable.asset_id, input.id))
      .execute();

    // Delete related simulated trades (cascade deletion)
    await db.delete(simulatedTradesTable)
      .where(eq(simulatedTradesTable.asset_id, input.id))
      .execute();

    // Finally, delete the asset
    await db.delete(assetsTable)
      .where(eq(assetsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Asset deletion failed:', error);
    throw error;
  }
}