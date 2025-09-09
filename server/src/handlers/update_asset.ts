import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type UpdateAssetInput, type Asset } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAsset = async (input: UpdateAssetInput): Promise<Asset> => {
  try {
    // First check if the asset exists
    const existingAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.id))
      .execute();

    if (existingAssets.length === 0) {
      throw new Error(`Asset with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.symbol !== undefined) {
      updateData['symbol'] = input.symbol;
    }
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.current_price !== undefined) {
      updateData['current_price'] = input.current_price.toString();
    }

    // Update the asset
    const result = await db.update(assetsTable)
      .set(updateData)
      .where(eq(assetsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const asset = result[0];
    return {
      ...asset,
      current_price: parseFloat(asset.current_price)
    };
  } catch (error) {
    console.error('Asset update failed:', error);
    throw error;
  }
};