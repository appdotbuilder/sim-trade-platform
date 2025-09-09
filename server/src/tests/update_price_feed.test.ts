import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { priceFeedsTable } from '../db/schema';
import { type UpdatePriceFeedInput } from '../schema';
import { updatePriceFeed } from '../handlers/update_price_feed';
import { eq } from 'drizzle-orm';

// Test input for updating price feed
const testUpdateInput: UpdatePriceFeedInput = {
  symbol: 'BTCUSD',
  current_price: 45000.50,
  price_change_24h: 1500.25,
  price_change_percentage_24h: 3.45,
  volume_24h: 2500000000.75,
  market_cap: 850000000000.50
};

describe('updatePriceFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test price feed
  const createTestPriceFeed = async () => {
    const result = await db.insert(priceFeedsTable)
      .values({
        symbol: 'BTCUSD',
        asset_type: 'crypto',
        current_price: '40000.00',
        price_change_24h: '500.00',
        price_change_percentage_24h: '1.25',
        volume_24h: '2000000000.00',
        market_cap: '800000000000.00'
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update a price feed successfully', async () => {
    // Create initial price feed
    await createTestPriceFeed();

    const result = await updatePriceFeed(testUpdateInput);

    // Verify updated fields
    expect(result.symbol).toEqual('BTCUSD');
    expect(result.current_price).toEqual(45000.50);
    expect(result.price_change_24h).toEqual(1500.25);
    expect(result.price_change_percentage_24h).toEqual(3.45);
    expect(result.volume_24h).toEqual(2500000000.75);
    expect(result.market_cap).toEqual(850000000000.50);
    expect(result.last_updated).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.asset_type).toEqual('crypto');

    // Verify types are correct
    expect(typeof result.current_price).toBe('number');
    expect(typeof result.price_change_24h).toBe('number');
    expect(typeof result.price_change_percentage_24h).toBe('number');
    expect(typeof result.volume_24h).toBe('number');
    expect(typeof result.market_cap).toBe('number');
  });

  it('should update price feed in database', async () => {
    // Create initial price feed
    const initial = await createTestPriceFeed();

    await updatePriceFeed(testUpdateInput);

    // Verify database was updated
    const updatedFeeds = await db.select()
      .from(priceFeedsTable)
      .where(eq(priceFeedsTable.id, initial.id))
      .execute();

    expect(updatedFeeds).toHaveLength(1);
    const updatedFeed = updatedFeeds[0];
    
    expect(parseFloat(updatedFeed.current_price)).toEqual(45000.50);
    expect(parseFloat(updatedFeed.price_change_24h)).toEqual(1500.25);
    expect(parseFloat(updatedFeed.price_change_percentage_24h)).toEqual(3.45);
    expect(parseFloat(updatedFeed.volume_24h)).toEqual(2500000000.75);
    expect(parseFloat(updatedFeed.market_cap!)).toEqual(850000000000.50);
    expect(updatedFeed.last_updated).toBeInstanceOf(Date);
  });

  it('should handle null market_cap correctly', async () => {
    // Create initial price feed
    await createTestPriceFeed();

    const inputWithoutMarketCap: UpdatePriceFeedInput = {
      symbol: 'BTCUSD',
      current_price: 42000.00,
      price_change_24h: -1000.00,
      price_change_percentage_24h: -2.33,
      volume_24h: 1800000000.00
      // market_cap is optional and not provided
    };

    const result = await updatePriceFeed(inputWithoutMarketCap);

    expect(result.market_cap).toBeNull();
    expect(result.current_price).toEqual(42000.00);
    expect(result.price_change_24h).toEqual(-1000.00);
    expect(result.price_change_percentage_24h).toEqual(-2.33);
    expect(result.volume_24h).toEqual(1800000000.00);
  });

  it('should handle negative price changes', async () => {
    // Create initial price feed
    await createTestPriceFeed();

    const negativeChangeInput: UpdatePriceFeedInput = {
      symbol: 'BTCUSD',
      current_price: 38500.75,
      price_change_24h: -1500.25,
      price_change_percentage_24h: -3.75,
      volume_24h: 1900000000.50,
      market_cap: 750000000000.25
    };

    const result = await updatePriceFeed(negativeChangeInput);

    expect(result.current_price).toEqual(38500.75);
    expect(result.price_change_24h).toEqual(-1500.25);
    expect(result.price_change_percentage_24h).toEqual(-3.75);
    expect(result.volume_24h).toEqual(1900000000.50);
    expect(result.market_cap).toEqual(750000000000.25);
  });

  it('should update last_updated timestamp', async () => {
    // Create initial price feed with older timestamp
    const initial = await createTestPriceFeed();
    const initialTimestamp = initial.last_updated;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await updatePriceFeed(testUpdateInput);

    expect(result.last_updated.getTime()).toBeGreaterThan(initialTimestamp.getTime());
  });

  it('should throw error when symbol does not exist', async () => {
    const nonExistentSymbolInput: UpdatePriceFeedInput = {
      symbol: 'NONEXISTENT',
      current_price: 100.00,
      price_change_24h: 5.00,
      price_change_percentage_24h: 5.26,
      volume_24h: 1000000.00,
      market_cap: 100000000.00
    };

    await expect(updatePriceFeed(nonExistentSymbolInput))
      .rejects.toThrow(/Price feed not found for symbol: NONEXISTENT/i);
  });

  it('should handle high precision decimal values', async () => {
    // Create initial price feed
    await createTestPriceFeed();

    const precisionInput: UpdatePriceFeedInput = {
      symbol: 'BTCUSD',
      current_price: 43765.12345678,
      price_change_24h: 1234.56789012,
      price_change_percentage_24h: 2.87, // Limited by precision(5,2) in schema
      volume_24h: 2876543210.98,
      market_cap: 876543210987.65
    };

    const result = await updatePriceFeed(precisionInput);

    expect(result.current_price).toBeCloseTo(43765.12345678, 8);
    expect(result.price_change_24h).toBeCloseTo(1234.56789012, 8);
    expect(result.price_change_percentage_24h).toBeCloseTo(2.87, 2); // precision(5,2) allows 2 decimal places
    expect(result.volume_24h).toBeCloseTo(2876543210.98, 2);
    expect(result.market_cap).toBeCloseTo(876543210987.65, 2);
  });

  it('should preserve other fields when updating', async () => {
    // Create initial price feed
    const initial = await createTestPriceFeed();

    const result = await updatePriceFeed(testUpdateInput);

    // Verify non-updated fields are preserved
    expect(result.id).toEqual(initial.id);
    expect(result.symbol).toEqual(initial.symbol);
    expect(result.asset_type).toEqual(initial.asset_type);
  });
});