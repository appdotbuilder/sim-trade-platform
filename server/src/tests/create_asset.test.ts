import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type CreateAssetInput } from '../schema';
import { createAsset } from '../handlers/create_asset';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateAssetInput = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  current_price: 150.25
};

describe('createAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an asset with all fields', async () => {
    const result = await createAsset(testInput);

    // Basic field validation
    expect(result.symbol).toEqual('AAPL');
    expect(result.name).toEqual('Apple Inc.');
    expect(result.current_price).toEqual(150.25);
    expect(typeof result.current_price).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save asset to database', async () => {
    const result = await createAsset(testInput);

    // Query using proper drizzle syntax
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].symbol).toEqual('AAPL');
    expect(assets[0].name).toEqual('Apple Inc.');
    expect(parseFloat(assets[0].current_price)).toEqual(150.25);
    expect(assets[0].created_at).toBeInstanceOf(Date);
    expect(assets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different asset types correctly', async () => {
    const cryptoInput: CreateAssetInput = {
      symbol: 'BTC',
      name: 'Bitcoin',
      current_price: 45000.56 // Limited to 2 decimal places due to database precision
    };

    const result = await createAsset(cryptoInput);

    expect(result.symbol).toEqual('BTC');
    expect(result.name).toEqual('Bitcoin');
    expect(result.current_price).toEqual(45000.56);
    expect(typeof result.current_price).toBe('number');
  });

  it('should enforce symbol uniqueness', async () => {
    // Create first asset
    await createAsset(testInput);

    // Try to create another asset with same symbol
    const duplicateInput: CreateAssetInput = {
      symbol: 'AAPL', // Same symbol as testInput
      name: 'Apple Inc. Duplicate',
      current_price: 160.00
    };

    await expect(createAsset(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle large price values', async () => {
    const highPriceInput: CreateAssetInput = {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      current_price: 2850.99
    };

    const result = await createAsset(highPriceInput);

    expect(result.current_price).toEqual(2850.99);
    expect(typeof result.current_price).toBe('number');

    // Verify in database
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(parseFloat(assets[0].current_price)).toEqual(2850.99);
  });

  it('should handle small decimal prices correctly', async () => {
    const smallPriceInput: CreateAssetInput = {
      symbol: 'PENNY',
      name: 'Penny Stock',
      current_price: 0.01 // Limited to 2 decimal places due to database precision
    };

    const result = await createAsset(smallPriceInput);

    expect(result.current_price).toEqual(0.01);
    expect(typeof result.current_price).toBe('number');

    // Verify precision is maintained in database
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(parseFloat(assets[0].current_price)).toEqual(0.01);
  });
});