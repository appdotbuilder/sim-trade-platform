import { db } from '../db';
import { priceFeedsTable } from '../db/schema';
import { type UpdatePriceFeedInput, type PriceFeed } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePriceFeed = async (input: UpdatePriceFeedInput): Promise<PriceFeed> => {
  try {
    // Update the price feed record for the given symbol
    const result = await db.update(priceFeedsTable)
      .set({
        current_price: input.current_price.toString(),
        price_change_24h: input.price_change_24h.toString(),
        price_change_percentage_24h: input.price_change_percentage_24h.toString(),
        volume_24h: input.volume_24h.toString(),
        market_cap: input.market_cap ? input.market_cap.toString() : null,
        last_updated: new Date()
      })
      .where(eq(priceFeedsTable.symbol, input.symbol))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Price feed not found for symbol: ${input.symbol}`);
    }

    // Convert numeric fields back to numbers before returning
    const priceFeed = result[0];
    return {
      ...priceFeed,
      current_price: parseFloat(priceFeed.current_price),
      price_change_24h: parseFloat(priceFeed.price_change_24h),
      price_change_percentage_24h: parseFloat(priceFeed.price_change_percentage_24h),
      volume_24h: parseFloat(priceFeed.volume_24h),
      market_cap: priceFeed.market_cap ? parseFloat(priceFeed.market_cap) : null
    };
  } catch (error) {
    console.error('Price feed update failed:', error);
    throw error;
  }
};