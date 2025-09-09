import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, signalsTable, simulatedTradesTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { deleteAsset } from '../handlers/delete_asset';
import { eq } from 'drizzle-orm';

describe('deleteAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an asset successfully', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'TEST',
        name: 'Test Asset',
        current_price: '100.00'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const input: DeleteByIdInput = { id: assetId };
    const result = await deleteAsset(input);

    expect(result.success).toBe(true);

    // Verify asset is deleted from database
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(deletedAsset).toHaveLength(0);
  });

  it('should delete asset and cascade delete related signals', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'TEST',
        name: 'Test Asset',
        current_price: '100.00'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Create related signal
    await db.insert(signalsTable)
      .values({
        asset_id: assetId,
        signal_type: 'BUY',
        target_price: '95.00',
        quantity: '10.0000',
        description: 'Test signal',
        is_active: true
      })
      .execute();

    const input: DeleteByIdInput = { id: assetId };
    const result = await deleteAsset(input);

    expect(result.success).toBe(true);

    // Verify asset is deleted
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(deletedAsset).toHaveLength(0);

    // Verify related signal is deleted
    const deletedSignals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.asset_id, assetId))
      .execute();

    expect(deletedSignals).toHaveLength(0);
  });

  it('should delete asset and cascade delete related simulated trades', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'TEST',
        name: 'Test Asset',
        current_price: '100.00'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Create related simulated trade
    await db.insert(simulatedTradesTable)
      .values({
        asset_id: assetId,
        trade_type: 'BUY',
        quantity: '5.0000',
        price: '98.00'
      })
      .execute();

    const input: DeleteByIdInput = { id: assetId };
    const result = await deleteAsset(input);

    expect(result.success).toBe(true);

    // Verify asset is deleted
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(deletedAsset).toHaveLength(0);

    // Verify related simulated trade is deleted
    const deletedTrades = await db.select()
      .from(simulatedTradesTable)
      .where(eq(simulatedTradesTable.asset_id, assetId))
      .execute();

    expect(deletedTrades).toHaveLength(0);
  });

  it('should delete asset with both signals and simulated trades', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'TEST',
        name: 'Test Asset',
        current_price: '100.00'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Create related signal
    await db.insert(signalsTable)
      .values({
        asset_id: assetId,
        signal_type: 'BUY',
        target_price: '95.00',
        quantity: '10.0000',
        description: 'Test signal',
        is_active: true
      })
      .execute();

    // Create related simulated trade
    await db.insert(simulatedTradesTable)
      .values({
        asset_id: assetId,
        trade_type: 'SELL',
        quantity: '3.0000',
        price: '102.00'
      })
      .execute();

    const input: DeleteByIdInput = { id: assetId };
    const result = await deleteAsset(input);

    expect(result.success).toBe(true);

    // Verify asset is deleted
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(deletedAsset).toHaveLength(0);

    // Verify related signal is deleted
    const deletedSignals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.asset_id, assetId))
      .execute();

    expect(deletedSignals).toHaveLength(0);

    // Verify related simulated trade is deleted
    const deletedTrades = await db.select()
      .from(simulatedTradesTable)
      .where(eq(simulatedTradesTable.asset_id, assetId))
      .execute();

    expect(deletedTrades).toHaveLength(0);
  });

  it('should throw error when asset does not exist', async () => {
    const input: DeleteByIdInput = { id: 999999 };

    await expect(deleteAsset(input)).rejects.toThrow(/Asset with id 999999 not found/i);
  });

  it('should not affect other assets when deleting one asset', async () => {
    // Create first asset
    const asset1Result = await db.insert(assetsTable)
      .values({
        symbol: 'ASSET1',
        name: 'First Asset',
        current_price: '100.00'
      })
      .returning()
      .execute();

    // Create second asset
    const asset2Result = await db.insert(assetsTable)
      .values({
        symbol: 'ASSET2',
        name: 'Second Asset',
        current_price: '200.00'
      })
      .returning()
      .execute();

    const asset1Id = asset1Result[0].id;
    const asset2Id = asset2Result[0].id;

    // Create signals for both assets
    await db.insert(signalsTable)
      .values({
        asset_id: asset1Id,
        signal_type: 'BUY',
        target_price: '95.00',
        quantity: '10.0000',
        description: 'Signal for asset 1',
        is_active: true
      })
      .execute();

    await db.insert(signalsTable)
      .values({
        asset_id: asset2Id,
        signal_type: 'SELL',
        target_price: '205.00',
        quantity: '5.0000',
        description: 'Signal for asset 2',
        is_active: true
      })
      .execute();

    // Delete only the first asset
    const input: DeleteByIdInput = { id: asset1Id };
    const result = await deleteAsset(input);

    expect(result.success).toBe(true);

    // Verify first asset is deleted
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset1Id))
      .execute();

    expect(deletedAsset).toHaveLength(0);

    // Verify second asset still exists
    const remainingAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset2Id))
      .execute();

    expect(remainingAsset).toHaveLength(1);
    expect(remainingAsset[0].symbol).toBe('ASSET2');

    // Verify signal for first asset is deleted
    const deletedSignal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.asset_id, asset1Id))
      .execute();

    expect(deletedSignal).toHaveLength(0);

    // Verify signal for second asset still exists
    const remainingSignal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.asset_id, asset2Id))
      .execute();

    expect(remainingSignal).toHaveLength(1);
    expect(remainingSignal[0].description).toBe('Signal for asset 2');
  });
});