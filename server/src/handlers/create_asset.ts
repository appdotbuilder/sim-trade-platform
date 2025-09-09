import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type CreateAssetInput, type Asset } from '../schema';

export const createAsset = async (input: CreateAssetInput): Promise<Asset> => {
  try {
    // Insert asset record
    const result = await db.insert(assetsTable)
      .values({
        symbol: input.symbol,
        name: input.name,
        current_price: input.current_price.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const asset = result[0];
    return {
      ...asset,
      current_price: parseFloat(asset.current_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Asset creation failed:', error);
    throw error;
  }
};