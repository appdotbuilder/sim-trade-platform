import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type SignalWithAsset } from '../schema';
import { eq } from 'drizzle-orm';

export async function getActiveSignals(): Promise<SignalWithAsset[]> {
  try {
    // Join signals with assets, filtering for active signals only
    const results = await db.select()
      .from(signalsTable)
      .innerJoin(assetsTable, eq(signalsTable.asset_id, assetsTable.id))
      .where(eq(signalsTable.is_active, true))
      .execute();

    // Transform the joined results into the expected format
    return results.map(result => ({
      id: result.signals.id,
      asset_id: result.signals.asset_id,
      signal_type: result.signals.signal_type,
      target_price: parseFloat(result.signals.target_price), // Convert numeric to number
      quantity: parseFloat(result.signals.quantity), // Convert numeric to number
      description: result.signals.description,
      is_active: result.signals.is_active,
      created_at: result.signals.created_at,
      updated_at: result.signals.updated_at,
      asset: {
        id: result.assets.id,
        symbol: result.assets.symbol,
        name: result.assets.name,
        current_price: parseFloat(result.assets.current_price), // Convert numeric to number
        created_at: result.assets.created_at,
        updated_at: result.assets.updated_at
      }
    }));
  } catch (error) {
    console.error('Failed to fetch active signals:', error);
    throw error;
  }
}