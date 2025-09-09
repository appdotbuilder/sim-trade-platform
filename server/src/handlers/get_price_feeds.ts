import { db } from '../db';
import { priceFeedsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type PriceFeed } from '../schema';

export async function getPriceFeeds(): Promise<PriceFeed[]> {
  try {
    const results = await db.select()
      .from(priceFeedsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(priceFeed => ({
      ...priceFeed,
      current_price: parseFloat(priceFeed.current_price),
      price_change_24h: parseFloat(priceFeed.price_change_24h),
      price_change_percentage_24h: parseFloat(priceFeed.price_change_percentage_24h),
      volume_24h: parseFloat(priceFeed.volume_24h),
      market_cap: priceFeed.market_cap ? parseFloat(priceFeed.market_cap) : null
    }));
  } catch (error) {
    console.error('Failed to fetch price feeds:', error);
    throw error;
  }
}

export async function getPriceFeedBySymbol(symbol: string): Promise<PriceFeed | null> {
  try {
    const results = await db.select()
      .from(priceFeedsTable)
      .where(eq(priceFeedsTable.symbol, symbol))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const priceFeed = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...priceFeed,
      current_price: parseFloat(priceFeed.current_price),
      price_change_24h: parseFloat(priceFeed.price_change_24h),
      price_change_percentage_24h: parseFloat(priceFeed.price_change_percentage_24h),
      volume_24h: parseFloat(priceFeed.volume_24h),
      market_cap: priceFeed.market_cap ? parseFloat(priceFeed.market_cap) : null
    };
  } catch (error) {
    console.error('Failed to fetch price feed by symbol:', error);
    throw error;
  }
}

export async function getPriceFeedsByAssetType(assetType: 'crypto' | 'stock' | 'forex'): Promise<PriceFeed[]> {
  try {
    const results = await db.select()
      .from(priceFeedsTable)
      .where(eq(priceFeedsTable.asset_type, assetType))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(priceFeed => ({
      ...priceFeed,
      current_price: parseFloat(priceFeed.current_price),
      price_change_24h: parseFloat(priceFeed.price_change_24h),
      price_change_percentage_24h: parseFloat(priceFeed.price_change_percentage_24h),
      volume_24h: parseFloat(priceFeed.volume_24h),
      market_cap: priceFeed.market_cap ? parseFloat(priceFeed.market_cap) : null
    }));
  } catch (error) {
    console.error('Failed to fetch price feeds by asset type:', error);
    throw error;
  }
}