import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type Asset } from '../schema';

export const getAssets = async (): Promise<Asset[]> => {
  try {
    // Fetch all assets from the database
    const results = await db.select()
      .from(assetsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(asset => ({
      ...asset,
      current_price: parseFloat(asset.current_price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    throw error;
  }
};