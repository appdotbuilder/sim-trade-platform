import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { priceFeedsTable } from '../db/schema';
import { getPriceFeeds, getPriceFeedBySymbol, getPriceFeedsByAssetType } from '../handlers/get_price_feeds';

// Test data for price feeds
const testPriceFeeds = [
  {
    symbol: 'BTC/USD',
    asset_type: 'crypto' as const,
    current_price: '45000.50',
    price_change_24h: '1200.25',
    price_change_percentage_24h: '2.75',
    volume_24h: '2500000000.00',
    market_cap: '850000000000.00'
  },
  {
    symbol: 'ETH/USD',
    asset_type: 'crypto' as const,
    current_price: '2800.75',
    price_change_24h: '-45.50',
    price_change_percentage_24h: '-1.60',
    volume_24h: '1800000000.00',
    market_cap: '340000000000.00'
  },
  {
    symbol: 'AAPL',
    asset_type: 'stock' as const,
    current_price: '175.25',
    price_change_24h: '3.50',
    price_change_percentage_24h: '2.04',
    volume_24h: '85000000.00',
    market_cap: '2750000000000.00'
  },
  {
    symbol: 'EUR/USD',
    asset_type: 'forex' as const,
    current_price: '1.0850',
    price_change_24h: '0.0025',
    price_change_percentage_24h: '0.23',
    volume_24h: '5200000000.00',
    market_cap: null
  }
];

describe('getPriceFeeds', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all price feeds', async () => {
    // Insert test data
    await db.insert(priceFeedsTable).values(testPriceFeeds).execute();

    const results = await getPriceFeeds();

    expect(results).toHaveLength(4);
    
    // Verify numeric conversions
    const btcFeed = results.find(feed => feed.symbol === 'BTC/USD');
    expect(btcFeed).toBeDefined();
    expect(typeof btcFeed!.current_price).toBe('number');
    expect(btcFeed!.current_price).toBe(45000.50);
    expect(typeof btcFeed!.price_change_24h).toBe('number');
    expect(btcFeed!.price_change_24h).toBe(1200.25);
    expect(typeof btcFeed!.volume_24h).toBe('number');
    expect(btcFeed!.volume_24h).toBe(2500000000.00);
    expect(typeof btcFeed!.market_cap).toBe('number');
    expect(btcFeed!.market_cap).toBe(850000000000.00);
  });

  it('should return empty array when no price feeds exist', async () => {
    const results = await getPriceFeeds();

    expect(results).toHaveLength(0);
  });

  it('should handle null market_cap values correctly', async () => {
    // Insert forex feed with null market cap
    await db.insert(priceFeedsTable).values([testPriceFeeds[3]]).execute();

    const results = await getPriceFeeds();

    expect(results).toHaveLength(1);
    const forexFeed = results[0];
    expect(forexFeed.symbol).toBe('EUR/USD');
    expect(forexFeed.market_cap).toBeNull();
    expect(typeof forexFeed.current_price).toBe('number');
    expect(forexFeed.current_price).toBe(1.0850);
  });

  it('should include all required fields', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[0]]).execute();

    const results = await getPriceFeeds();

    expect(results).toHaveLength(1);
    const feed = results[0];
    
    expect(feed.id).toBeDefined();
    expect(feed.symbol).toBe('BTC/USD');
    expect(feed.asset_type).toBe('crypto');
    expect(feed.current_price).toBeDefined();
    expect(feed.price_change_24h).toBeDefined();
    expect(feed.price_change_percentage_24h).toBeDefined();
    expect(feed.volume_24h).toBeDefined();
    expect(feed.last_updated).toBeInstanceOf(Date);
  });
});

describe('getPriceFeedBySymbol', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return price feed for existing symbol', async () => {
    await db.insert(priceFeedsTable).values(testPriceFeeds).execute();

    const result = await getPriceFeedBySymbol('ETH/USD');

    expect(result).toBeDefined();
    expect(result!.symbol).toBe('ETH/USD');
    expect(result!.asset_type).toBe('crypto');
    expect(typeof result!.current_price).toBe('number');
    expect(result!.current_price).toBe(2800.75);
    expect(typeof result!.price_change_24h).toBe('number');
    expect(result!.price_change_24h).toBe(-45.50);
    expect(typeof result!.price_change_percentage_24h).toBe('number');
    expect(result!.price_change_percentage_24h).toBe(-1.60);
  });

  it('should return null for non-existent symbol', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[0]]).execute();

    const result = await getPriceFeedBySymbol('NONEXISTENT');

    expect(result).toBeNull();
  });

  it('should handle case-sensitive symbol matching', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[0]]).execute();

    const result = await getPriceFeedBySymbol('btc/usd'); // lowercase

    expect(result).toBeNull();
  });

  it('should return stock price feed correctly', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[2]]).execute();

    const result = await getPriceFeedBySymbol('AAPL');

    expect(result).toBeDefined();
    expect(result!.symbol).toBe('AAPL');
    expect(result!.asset_type).toBe('stock');
    expect(typeof result!.current_price).toBe('number');
    expect(result!.current_price).toBe(175.25);
    expect(typeof result!.market_cap).toBe('number');
    expect(result!.market_cap).toBe(2750000000000.00);
  });

  it('should handle forex feeds with null market cap', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[3]]).execute();

    const result = await getPriceFeedBySymbol('EUR/USD');

    expect(result).toBeDefined();
    expect(result!.symbol).toBe('EUR/USD');
    expect(result!.asset_type).toBe('forex');
    expect(result!.market_cap).toBeNull();
    expect(typeof result!.current_price).toBe('number');
    expect(result!.current_price).toBe(1.0850);
  });
});

describe('getPriceFeedsByAssetType', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return crypto price feeds only', async () => {
    await db.insert(priceFeedsTable).values(testPriceFeeds).execute();

    const results = await getPriceFeedsByAssetType('crypto');

    expect(results).toHaveLength(2);
    results.forEach(feed => {
      expect(feed.asset_type).toBe('crypto');
      expect(['BTC/USD', 'ETH/USD']).toContain(feed.symbol);
      expect(typeof feed.current_price).toBe('number');
      expect(typeof feed.price_change_24h).toBe('number');
      expect(typeof feed.volume_24h).toBe('number');
    });
  });

  it('should return stock price feeds only', async () => {
    await db.insert(priceFeedsTable).values(testPriceFeeds).execute();

    const results = await getPriceFeedsByAssetType('stock');

    expect(results).toHaveLength(1);
    expect(results[0].asset_type).toBe('stock');
    expect(results[0].symbol).toBe('AAPL');
    expect(typeof results[0].current_price).toBe('number');
    expect(results[0].current_price).toBe(175.25);
  });

  it('should return forex price feeds only', async () => {
    await db.insert(priceFeedsTable).values(testPriceFeeds).execute();

    const results = await getPriceFeedsByAssetType('forex');

    expect(results).toHaveLength(1);
    expect(results[0].asset_type).toBe('forex');
    expect(results[0].symbol).toBe('EUR/USD');
    expect(typeof results[0].current_price).toBe('number');
    expect(results[0].current_price).toBe(1.0850);
    expect(results[0].market_cap).toBeNull();
  });

  it('should return empty array when no feeds exist for asset type', async () => {
    // Insert only crypto feeds
    await db.insert(priceFeedsTable).values([testPriceFeeds[0], testPriceFeeds[1]]).execute();

    const results = await getPriceFeedsByAssetType('stock');

    expect(results).toHaveLength(0);
  });

  it('should handle negative price changes correctly', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[1]]).execute(); // ETH with negative change

    const results = await getPriceFeedsByAssetType('crypto');

    expect(results).toHaveLength(1);
    const ethFeed = results[0];
    expect(ethFeed.symbol).toBe('ETH/USD');
    expect(typeof ethFeed.price_change_24h).toBe('number');
    expect(ethFeed.price_change_24h).toBe(-45.50);
    expect(typeof ethFeed.price_change_percentage_24h).toBe('number');
    expect(ethFeed.price_change_percentage_24h).toBe(-1.60);
  });

  it('should maintain proper numeric precision', async () => {
    await db.insert(priceFeedsTable).values([testPriceFeeds[3]]).execute(); // EUR/USD with small decimal values

    const results = await getPriceFeedsByAssetType('forex');

    expect(results).toHaveLength(1);
    const forexFeed = results[0];
    expect(typeof forexFeed.price_change_24h).toBe('number');
    expect(forexFeed.price_change_24h).toBe(0.0025);
    expect(typeof forexFeed.price_change_percentage_24h).toBe('number');
    expect(forexFeed.price_change_percentage_24h).toBe(0.23);
  });
});