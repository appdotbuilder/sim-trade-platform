import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, copyTradersTable, signalsTable } from '../db/schema';
import { seedInitialData } from '../handlers/seed_initial_data';
import { count, eq } from 'drizzle-orm';

describe('seedInitialData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should seed database with initial data', async () => {
    const result = await seedInitialData();

    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully seeded database');
    expect(result.message).toContain('10 assets');
    expect(result.message).toContain('10 copy traders');
    expect(result.message).toContain('6 signals');
  });

  it('should create correct number of assets', async () => {
    await seedInitialData();

    const [assetCount] = await db.select({ count: count() })
      .from(assetsTable)
      .execute();

    expect(assetCount.count).toBe(10);
  });

  it('should create assets with correct data types', async () => {
    await seedInitialData();

    const assets = await db.select()
      .from(assetsTable)
      .execute();

    // Check first asset (BTC)
    const btcAsset = assets.find(asset => asset.symbol === 'BTC');
    expect(btcAsset).toBeDefined();
    expect(btcAsset!.name).toBe('Bitcoin');
    expect(typeof parseFloat(btcAsset!.current_price)).toBe('number');
    expect(parseFloat(btcAsset!.current_price)).toBe(65432.10);
    expect(btcAsset!.created_at).toBeInstanceOf(Date);
    expect(btcAsset!.updated_at).toBeInstanceOf(Date);
  });

  it('should create unique asset symbols', async () => {
    await seedInitialData();

    const assets = await db.select()
      .from(assetsTable)
      .execute();

    const symbols = assets.map(asset => asset.symbol);
    const uniqueSymbols = new Set(symbols);

    expect(symbols.length).toBe(uniqueSymbols.size);
  });

  it('should create correct number of copy traders', async () => {
    await seedInitialData();

    const [traderCount] = await db.select({ count: count() })
      .from(copyTradersTable)
      .execute();

    expect(traderCount.count).toBe(10);
  });

  it('should create copy traders with valid statistics', async () => {
    await seedInitialData();

    const traders = await db.select()
      .from(copyTradersTable)
      .execute();

    traders.forEach(trader => {
      expect(trader.name).toBeDefined();
      expect(trader.name.length).toBeGreaterThan(0);
      expect(trader.trades_won).toBeGreaterThanOrEqual(0);
      expect(trader.trades_lost).toBeGreaterThanOrEqual(0);
      expect(trader.followers).toBeGreaterThanOrEqual(0);
      expect(trader.created_at).toBeInstanceOf(Date);
      expect(trader.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should create correct number of signals', async () => {
    await seedInitialData();

    const [signalCount] = await db.select({ count: count() })
      .from(signalsTable)
      .execute();

    expect(signalCount.count).toBe(6);
  });

  it('should create signals with valid foreign key references', async () => {
    await seedInitialData();

    const signals = await db.select()
      .from(signalsTable)
      .execute();

    const assets = await db.select()
      .from(assetsTable)
      .execute();

    const assetIds = new Set(assets.map(asset => asset.id));

    signals.forEach(signal => {
      expect(assetIds.has(signal.asset_id)).toBe(true);
      expect(['BUY', 'SELL']).toContain(signal.signal_type);
      expect(typeof parseFloat(signal.target_price)).toBe('number');
      expect(typeof parseFloat(signal.quantity)).toBe('number');
      expect(parseFloat(signal.target_price)).toBeGreaterThan(0);
      expect(parseFloat(signal.quantity)).toBeGreaterThan(0);
      expect(signal.created_at).toBeInstanceOf(Date);
      expect(signal.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should create both active and inactive signals', async () => {
    await seedInitialData();

    const signals = await db.select()
      .from(signalsTable)
      .execute();

    const activeSignals = signals.filter(signal => signal.is_active);
    const inactiveSignals = signals.filter(signal => !signal.is_active);

    expect(activeSignals.length).toBeGreaterThan(0);
    expect(inactiveSignals.length).toBeGreaterThan(0);
  });

  it('should not seed data when database already contains assets', async () => {
    // First seed
    await seedInitialData();

    // Attempt second seed
    const result = await seedInitialData();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Database already contains data');
    expect(result.message).toContain('Seeding skipped to avoid duplicates');

    // Verify counts haven't doubled
    const [assetCount] = await db.select({ count: count() })
      .from(assetsTable)
      .execute();
    
    const [traderCount] = await db.select({ count: count() })
      .from(copyTradersTable)
      .execute();

    expect(assetCount.count).toBe(10);
    expect(traderCount.count).toBe(10);
  });

  it('should not seed data when database already contains copy traders', async () => {
    // Add just a copy trader first
    await db.insert(copyTradersTable)
      .values({
        name: 'Existing Trader',
        trades_won: 10,
        trades_lost: 5,
        followers: 100
      })
      .execute();

    const result = await seedInitialData();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Database already contains data');
  });

  it('should create signals with proper descriptions', async () => {
    await seedInitialData();

    const signals = await db.select()
      .from(signalsTable)
      .execute();

    const signalsWithDescriptions = signals.filter(signal => 
      signal.description !== null && signal.description!.length > 0
    );

    expect(signalsWithDescriptions.length).toBeGreaterThan(0);
    
    // Check that descriptions are meaningful
    signalsWithDescriptions.forEach(signal => {
      expect(signal.description).toBeDefined();
      expect(signal.description!.length).toBeGreaterThan(5);
    });
  });

  it('should create signals for different asset types', async () => {
    await seedInitialData();

    const signals = await db.select()
      .from(signalsTable)
      .execute();

    const assets = await db.select()
      .from(assetsTable)
      .execute();

    // Get the assets that have signals
    const assetsWithSignals = new Set(signals.map(signal => signal.asset_id));
    
    // Verify we have signals for different types of assets
    expect(assetsWithSignals.size).toBeGreaterThan(1);

    // Check for crypto assets (BTC, ETH)
    const cryptoAssets = assets.filter(asset => ['BTC', 'ETH'].includes(asset.symbol));
    const hasCryptoSignals = cryptoAssets.some(asset => assetsWithSignals.has(asset.id));
    expect(hasCryptoSignals).toBe(true);

    // Check for stock assets
    const stockAssets = assets.filter(asset => ['AAPL', 'GOOGL', 'TSLA'].includes(asset.symbol));
    const hasStockSignals = stockAssets.some(asset => assetsWithSignals.has(asset.id));
    expect(hasStockSignals).toBe(true);
  });
});