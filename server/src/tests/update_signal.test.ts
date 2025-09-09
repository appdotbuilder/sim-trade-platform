import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type UpdateSignalInput } from '../schema';
import { updateSignal } from '../handlers/update_signal';
import { eq } from 'drizzle-orm';

describe('updateSignal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test asset
  const createTestAsset = async (symbol = 'BTC', name = 'Bitcoin', price = 50000) => {
    const result = await db.insert(assetsTable)
      .values({
        symbol,
        name,
        current_price: price.toString()
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create a test signal
  const createTestSignal = async (assetId: number) => {
    const result = await db.insert(signalsTable)
      .values({
        asset_id: assetId,
        signal_type: 'BUY',
        target_price: '45000.00',
        quantity: '1.5000',
        description: 'Test signal',
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update all signal fields', async () => {
    // Create test asset and signal
    const asset = await createTestAsset();
    const signal = await createTestSignal(asset.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      signal_type: 'SELL',
      target_price: 55000,
      quantity: 2.0,
      description: 'Updated signal description',
      is_active: false
    };

    const result = await updateSignal(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(signal.id);
    expect(result.signal_type).toEqual('SELL');
    expect(result.target_price).toEqual(55000);
    expect(result.quantity).toEqual(2.0);
    expect(result.description).toEqual('Updated signal description');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(signal.updated_at.getTime());
  });

  it('should update partial signal fields', async () => {
    // Create test asset and signal
    const asset = await createTestAsset();
    const signal = await createTestSignal(asset.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      target_price: 48000,
      is_active: false
    };

    const result = await updateSignal(updateInput);

    // Verify only specified fields are updated, others remain unchanged
    expect(result.target_price).toEqual(48000);
    expect(result.is_active).toEqual(false);
    expect(result.signal_type).toEqual('BUY'); // Should remain unchanged
    expect(result.quantity).toEqual(1.5); // Should remain unchanged
    expect(result.description).toEqual('Test signal'); // Should remain unchanged
  });

  it('should update signal with new asset_id', async () => {
    // Create two assets
    const asset1 = await createTestAsset('BTC', 'Bitcoin', 50000);
    const asset2 = await createTestAsset('ETH', 'Ethereum', 3000);
    
    // Create signal with first asset
    const signal = await createTestSignal(asset1.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      asset_id: asset2.id,
      target_price: 3200
    };

    const result = await updateSignal(updateInput);

    // Verify asset_id is updated
    expect(result.asset_id).toEqual(asset2.id);
    expect(result.target_price).toEqual(3200);
  });

  it('should save updated signal to database', async () => {
    // Create test asset and signal
    const asset = await createTestAsset();
    const signal = await createTestSignal(asset.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      target_price: 52000,
      description: 'Database test update'
    };

    await updateSignal(updateInput);

    // Verify signal is updated in database
    const signals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, signal.id))
      .execute();

    expect(signals).toHaveLength(1);
    expect(parseFloat(signals[0].target_price)).toEqual(52000);
    expect(signals[0].description).toEqual('Database test update');
  });

  it('should handle null description update', async () => {
    // Create test asset and signal
    const asset = await createTestAsset();
    const signal = await createTestSignal(asset.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      description: null
    };

    const result = await updateSignal(updateInput);

    expect(result.description).toBeNull();
  });

  it('should throw error when signal does not exist', async () => {
    const updateInput: UpdateSignalInput = {
      id: 999,
      target_price: 50000
    };

    await expect(updateSignal(updateInput)).rejects.toThrow(/signal with id 999 not found/i);
  });

  it('should throw error when asset_id does not exist', async () => {
    // Create test asset and signal
    const asset = await createTestAsset();
    const signal = await createTestSignal(asset.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      asset_id: 999
    };

    await expect(updateSignal(updateInput)).rejects.toThrow(/asset with id 999 not found/i);
  });

  it('should verify numeric field conversions', async () => {
    // Create test asset and signal
    const asset = await createTestAsset();
    const signal = await createTestSignal(asset.id);

    const updateInput: UpdateSignalInput = {
      id: signal.id,
      target_price: 47500.75,
      quantity: 2.3456
    };

    const result = await updateSignal(updateInput);

    // Verify numeric types are correctly converted
    expect(typeof result.target_price).toBe('number');
    expect(typeof result.quantity).toBe('number');
    expect(result.target_price).toEqual(47500.75);
    expect(result.quantity).toEqual(2.3456);
  });
});