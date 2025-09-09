import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type CreateSignalInput } from '../schema';
import { createSignal } from '../handlers/create_signal';
import { eq } from 'drizzle-orm';

// Test asset data
const testAsset = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  current_price: '150.25'
};

// Simple test input
const testInput: CreateSignalInput = {
  asset_id: 1, // Will be updated after creating test asset
  signal_type: 'BUY',
  target_price: 155.50,
  quantity: 100.5,
  description: 'Strong bullish signal on Apple',
  is_active: true
};

describe('createSignal', () => {
  let testAssetId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test asset first (required for foreign key)
    const assetResult = await db.insert(assetsTable)
      .values(testAsset)
      .returning()
      .execute();
    
    testAssetId = assetResult[0].id;
    testInput.asset_id = testAssetId;
  });

  afterEach(resetDB);

  it('should create a signal with all fields', async () => {
    const result = await createSignal(testInput);

    // Basic field validation
    expect(result.asset_id).toEqual(testAssetId);
    expect(result.signal_type).toEqual('BUY');
    expect(result.target_price).toEqual(155.50);
    expect(typeof result.target_price).toEqual('number');
    expect(result.quantity).toEqual(100.5);
    expect(typeof result.quantity).toEqual('number');
    expect(result.description).toEqual('Strong bullish signal on Apple');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save signal to database correctly', async () => {
    const result = await createSignal(testInput);

    // Query using proper drizzle syntax
    const signals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, result.id))
      .execute();

    expect(signals).toHaveLength(1);
    const signal = signals[0];
    expect(signal.asset_id).toEqual(testAssetId);
    expect(signal.signal_type).toEqual('BUY');
    expect(parseFloat(signal.target_price)).toEqual(155.50);
    expect(parseFloat(signal.quantity)).toEqual(100.5);
    expect(signal.description).toEqual('Strong bullish signal on Apple');
    expect(signal.is_active).toEqual(true);
    expect(signal.created_at).toBeInstanceOf(Date);
    expect(signal.updated_at).toBeInstanceOf(Date);
  });

  it('should create signal with SELL type', async () => {
    const sellInput: CreateSignalInput = {
      ...testInput,
      signal_type: 'SELL',
      target_price: 145.00,
      description: 'Bearish signal detected'
    };

    const result = await createSignal(sellInput);

    expect(result.signal_type).toEqual('SELL');
    expect(result.target_price).toEqual(145.00);
    expect(result.description).toEqual('Bearish signal detected');
  });

  it('should create signal with null description', async () => {
    const inputWithNullDesc: CreateSignalInput = {
      ...testInput,
      description: null
    };

    const result = await createSignal(inputWithNullDesc);

    expect(result.description).toBeNull();
  });

  it('should create signal with default is_active value', async () => {
    // Remove is_active from input to test default behavior
    const { is_active, ...inputWithoutActive } = testInput;
    
    // Zod will apply the default value of true
    const result = await createSignal({
      ...inputWithoutActive,
      is_active: true // Explicit since handler expects parsed input
    });

    expect(result.is_active).toEqual(true);
  });

  it('should create inactive signal when is_active is false', async () => {
    const inactiveInput: CreateSignalInput = {
      ...testInput,
      is_active: false
    };

    const result = await createSignal(inactiveInput);

    expect(result.is_active).toEqual(false);
  });

  it('should handle decimal quantities correctly', async () => {
    const decimalInput: CreateSignalInput = {
      ...testInput,
      quantity: 25.7534 // Test precision
    };

    const result = await createSignal(decimalInput);

    expect(result.quantity).toEqual(25.7534);
    expect(typeof result.quantity).toEqual('number');
  });

  it('should handle high precision target prices', async () => {
    const preciseInput: CreateSignalInput = {
      ...testInput,
      target_price: 123.4567 // Test precision
    };

    const result = await createSignal(preciseInput);

    expect(result.target_price).toEqual(123.46); // Should round to 2 decimal places due to database precision
    expect(typeof result.target_price).toEqual('number');
  });

  it('should throw error when asset does not exist', async () => {
    const invalidInput: CreateSignalInput = {
      ...testInput,
      asset_id: 99999 // Non-existent asset ID
    };

    await expect(createSignal(invalidInput)).rejects.toThrow(/Asset with id 99999 does not exist/i);
  });

  it('should create multiple signals for the same asset', async () => {
    const signal1 = await createSignal(testInput);
    
    const secondInput: CreateSignalInput = {
      ...testInput,
      signal_type: 'SELL',
      target_price: 140.00,
      description: 'Second signal for same asset'
    };
    
    const signal2 = await createSignal(secondInput);

    expect(signal1.id).not.toEqual(signal2.id);
    expect(signal1.asset_id).toEqual(signal2.asset_id);
    expect(signal1.signal_type).toEqual('BUY');
    expect(signal2.signal_type).toEqual('SELL');
  });
});