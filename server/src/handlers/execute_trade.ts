import { db } from '../db';
import { assetsTable, simulatedTradesTable } from '../db/schema';
import { type ExecuteTradeInput, type SimulatedTrade } from '../schema';
import { eq } from 'drizzle-orm';

export async function executeTrade(input: ExecuteTradeInput): Promise<SimulatedTrade> {
  try {
    // First, verify that the asset exists and get its current price
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (assets.length === 0) {
      throw new Error(`Asset with ID ${input.asset_id} not found`);
    }

    const asset = assets[0];
    const currentPrice = parseFloat(asset.current_price);

    // Create the simulated trade record
    const result = await db.insert(simulatedTradesTable)
      .values({
        asset_id: input.asset_id,
        trade_type: input.trade_type,
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        price: currentPrice.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const trade = result[0];
    return {
      ...trade,
      quantity: parseFloat(trade.quantity), // Convert string back to number
      price: parseFloat(trade.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Trade execution failed:', error);
    throw error;
  }
}