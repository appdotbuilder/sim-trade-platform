import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type UpdateAssetInput, type CreateAssetInput } from '../schema';
import { updateAsset } from '../handlers/update_asset';
import { eq } from 'drizzle-orm';

// Helper function to create a test asset
const createTestAsset = async (data: CreateAssetInput) => {
  const result = await db.insert(assetsTable)
    .values({
      symbol: data.symbol,
      name: data.name,
      current_price: data.current_price.toString()
    })
    .returning()
    .execute();

  const asset = result[0];
  return {
    ...asset,
    current_price: parseFloat(asset.current_price)
  };
};

const testAssetData: CreateAssetInput = {
  symbol: 'BTC',
  name: 'Bitcoin',
  current_price: 45000.50
};

describe('updateAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of an asset', async () => {
    // Create a test asset first
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id,
      symbol: 'ETH',
      name: 'Ethereum',
      current_price: 3000.25
    };

    const result = await updateAsset(updateInput);

    expect(result.id).toEqual(createdAsset.id);
    expect(result.symbol).toEqual('ETH');
    expect(result.name).toEqual('Ethereum');
    expect(result.current_price).toEqual(3000.25);
    expect(typeof result.current_price).toBe('number');
    expect(result.created_at).toEqual(createdAsset.created_at);
    expect(result.updated_at).not.toEqual(createdAsset.updated_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id,
      current_price: 50000.75
    };

    const result = await updateAsset(updateInput);

    expect(result.id).toEqual(createdAsset.id);
    expect(result.symbol).toEqual(testAssetData.symbol); // Should remain unchanged
    expect(result.name).toEqual(testAssetData.name); // Should remain unchanged
    expect(result.current_price).toEqual(50000.75);
    expect(result.updated_at).not.toEqual(createdAsset.updated_at);
  });

  it('should update symbol only', async () => {
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id,
      symbol: 'BTC-NEW'
    };

    const result = await updateAsset(updateInput);

    expect(result.symbol).toEqual('BTC-NEW');
    expect(result.name).toEqual(testAssetData.name);
    expect(result.current_price).toEqual(testAssetData.current_price);
  });

  it('should update name only', async () => {
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id,
      name: 'Bitcoin Cash'
    };

    const result = await updateAsset(updateInput);

    expect(result.symbol).toEqual(testAssetData.symbol);
    expect(result.name).toEqual('Bitcoin Cash');
    expect(result.current_price).toEqual(testAssetData.current_price);
  });

  it('should persist changes in database', async () => {
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id,
      symbol: 'LTC',
      name: 'Litecoin',
      current_price: 150.00
    };

    await updateAsset(updateInput);

    // Query database directly to verify persistence
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, createdAsset.id))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].symbol).toEqual('LTC');
    expect(assets[0].name).toEqual('Litecoin');
    expect(parseFloat(assets[0].current_price)).toEqual(150.00);
    expect(assets[0].updated_at).not.toEqual(createdAsset.updated_at);
  });

  it('should handle decimal prices correctly', async () => {
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id,
      current_price: 99999.99
    };

    const result = await updateAsset(updateInput);

    expect(result.current_price).toEqual(99999.99);
    expect(typeof result.current_price).toBe('number');

    // Verify in database
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, createdAsset.id))
      .execute();

    expect(parseFloat(assets[0].current_price)).toEqual(99999.99);
  });

  it('should throw error when asset does not exist', async () => {
    const updateInput: UpdateAssetInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Asset'
    };

    await expect(updateAsset(updateInput)).rejects.toThrow(/Asset with id 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const createdAsset = await createTestAsset(testAssetData);

    const updateInput: UpdateAssetInput = {
      id: createdAsset.id
      // No fields to update
    };

    const result = await updateAsset(updateInput);

    // Should still update the updated_at timestamp
    expect(result.id).toEqual(createdAsset.id);
    expect(result.symbol).toEqual(testAssetData.symbol);
    expect(result.name).toEqual(testAssetData.name);
    expect(result.current_price).toEqual(testAssetData.current_price);
    expect(result.updated_at).not.toEqual(createdAsset.updated_at);
  });
});