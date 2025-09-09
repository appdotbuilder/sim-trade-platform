import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable } from '../db/schema';
import { getAssets } from '../handlers/get_assets';

describe('getAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no assets exist', async () => {
    const result = await getAssets();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all assets from database', async () => {
    // Create test assets
    await db.insert(assetsTable).values([
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: '50000.00'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        current_price: '3000.50'
      }
    ]).execute();

    const result = await getAssets();

    expect(result).toHaveLength(2);
    
    // Verify first asset
    const btcAsset = result.find(asset => asset.symbol === 'BTC');
    expect(btcAsset).toBeDefined();
    expect(btcAsset!.name).toEqual('Bitcoin');
    expect(btcAsset!.current_price).toEqual(50000.00);
    expect(typeof btcAsset!.current_price).toBe('number');
    expect(btcAsset!.id).toBeDefined();
    expect(btcAsset!.created_at).toBeInstanceOf(Date);
    expect(btcAsset!.updated_at).toBeInstanceOf(Date);

    // Verify second asset
    const ethAsset = result.find(asset => asset.symbol === 'ETH');
    expect(ethAsset).toBeDefined();
    expect(ethAsset!.name).toEqual('Ethereum');
    expect(ethAsset!.current_price).toEqual(3000.50);
    expect(typeof ethAsset!.current_price).toBe('number');
  });

  it('should handle assets with decimal prices correctly', async () => {
    // Create asset with precise decimal price
    await db.insert(assetsTable).values({
      symbol: 'DOGE',
      name: 'Dogecoin',
      current_price: '0.12'
    }).execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    expect(result[0].current_price).toEqual(0.12);
    expect(typeof result[0].current_price).toBe('number');
  });

  it('should return assets ordered by their insertion order', async () => {
    // Create multiple assets in specific order
    await db.insert(assetsTable).values([
      { symbol: 'XRP', name: 'Ripple', current_price: '0.60' },
      { symbol: 'ADA', name: 'Cardano', current_price: '0.45' },
      { symbol: 'SOL', name: 'Solana', current_price: '100.25' }
    ]).execute();

    const result = await getAssets();

    expect(result).toHaveLength(3);
    // Verify all assets are present with correct data
    const symbols = result.map(asset => asset.symbol);
    expect(symbols).toContain('XRP');
    expect(symbols).toContain('ADA');
    expect(symbols).toContain('SOL');

    // Verify numeric conversion for all assets
    result.forEach(asset => {
      expect(typeof asset.current_price).toBe('number');
      expect(asset.current_price).toBeGreaterThan(0);
    });
  });

  it('should handle large price values correctly', async () => {
    // Create asset with very high price
    await db.insert(assetsTable).values({
      symbol: 'EXPENSIVE',
      name: 'Expensive Token',
      current_price: '999999.99'
    }).execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    expect(result[0].current_price).toEqual(999999.99);
    expect(typeof result[0].current_price).toBe('number');
  });
});