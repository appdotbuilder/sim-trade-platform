import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type SignalWithAsset } from '../schema';
import { eq } from 'drizzle-orm';

export async function getSignals(): Promise<SignalWithAsset[]> {
  try {
    // Join signals with assets to get asset information
    const results = await db.select()
      .from(signalsTable)
      .innerJoin(assetsTable, eq(signalsTable.asset_id, assetsTable.id))
      .execute();

    // Transform the joined results to match SignalWithAsset schema
    return results.map(result => ({
      // Signal fields
      id: result.signals.id,
      asset_id: result.signals.asset_id,
      signal_type: result.signals.signal_type,
      target_price: parseFloat(result.signals.target_price), // Convert numeric to number
      quantity: parseFloat(result.signals.quantity), // Convert numeric to number
      description: result.signals.description,
      is_active: result.signals.is_active,
      created_at: result.signals.created_at,
      updated_at: result.signals.updated_at,
      // Asset fields
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
    console.error('Failed to fetch signals:', error);
    throw error;
  }
}