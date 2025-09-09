import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, signalsTable } from '../db/schema';
import { type CreateAssetInput, type CreateSignalInput } from '../schema';
import { getSignals } from '../handlers/get_signals';
import { eq } from 'drizzle-orm';

describe('getSignals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no signals exist', async () => {
    const result = await getSignals();
    expect(result).toEqual([]);
  });

  it('should return signals with asset information', async () => {
    // Create test asset first
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: '45000.00'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create test signal
    const signalInput: CreateSignalInput = {
      asset_id: asset.id,
      signal_type: 'BUY',
      target_price: 46000.00,
      quantity: 1.5,
      description: 'Buy Bitcoin on breakout',
      is_active: true
    };

    await db.insert(signalsTable)
      .values({
        asset_id: signalInput.asset_id,
        signal_type: signalInput.signal_type,
        target_price: signalInput.target_price.toString(),
        quantity: signalInput.quantity.toString(),
        description: signalInput.description,
        is_active: signalInput.is_active
      })
      .execute();

    const result = await getSignals();

    expect(result).toHaveLength(1);
    const signal = result[0];

    // Verify signal fields
    expect(signal.id).toBeDefined();
    expect(signal.asset_id).toEqual(asset.id);
    expect(signal.signal_type).toEqual('BUY');
    expect(signal.target_price).toEqual(46000.00);
    expect(typeof signal.target_price).toBe('number');
    expect(signal.quantity).toEqual(1.5);
    expect(typeof signal.quantity).toBe('number');
    expect(signal.description).toEqual('Buy Bitcoin on breakout');
    expect(signal.is_active).toBe(true);
    expect(signal.created_at).toBeInstanceOf(Date);
    expect(signal.updated_at).toBeInstanceOf(Date);

    // Verify asset information is included
    expect(signal.asset).toBeDefined();
    expect(signal.asset.id).toEqual(asset.id);
    expect(signal.asset.symbol).toEqual('BTC');
    expect(signal.asset.name).toEqual('Bitcoin');
    expect(signal.asset.current_price).toEqual(45000);
    expect(typeof signal.asset.current_price).toBe('number');
    expect(signal.asset.created_at).toBeInstanceOf(Date);
    expect(signal.asset.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple signals with different assets', async () => {
    // Create multiple test assets
    const btcResult = await db.insert(assetsTable)
      .values({
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: '45000.00'
      })
      .returning()
      .execute();

    const ethResult = await db.insert(assetsTable)
      .values({
        symbol: 'ETH',
        name: 'Ethereum',
        current_price: '3000.00'
      })
      .returning()
      .execute();

    const btcAsset = btcResult[0];
    const ethAsset = ethResult[0];

    // Create signals for both assets
    await db.insert(signalsTable)
      .values([
        {
          asset_id: btcAsset.id,
          signal_type: 'BUY',
          target_price: '46000.00',
          quantity: '1.0',
          description: 'Bitcoin buy signal',
          is_active: true
        },
        {
          asset_id: ethAsset.id,
          signal_type: 'SELL',
          target_price: '2900.00',
          quantity: '5.0',
          description: 'Ethereum sell signal',
          is_active: false
        }
      ])
      .execute();

    const result = await getSignals();

    expect(result).toHaveLength(2);

    // Check BTC signal
    const btcSignal = result.find(s => s.asset.symbol === 'BTC');
    expect(btcSignal).toBeDefined();
    expect(btcSignal!.signal_type).toEqual('BUY');
    expect(btcSignal!.target_price).toEqual(46000);
    expect(btcSignal!.quantity).toEqual(1.0);
    expect(btcSignal!.is_active).toBe(true);
    expect(btcSignal!.asset.name).toEqual('Bitcoin');

    // Check ETH signal
    const ethSignal = result.find(s => s.asset.symbol === 'ETH');
    expect(ethSignal).toBeDefined();
    expect(ethSignal!.signal_type).toEqual('SELL');
    expect(ethSignal!.target_price).toEqual(2900);
    expect(ethSignal!.quantity).toEqual(5.0);
    expect(ethSignal!.is_active).toBe(false);
    expect(ethSignal!.asset.name).toEqual('Ethereum');
  });

  it('should handle signals with null description', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ADA',
        name: 'Cardano',
        current_price: '0.45'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create signal with null description
    await db.insert(signalsTable)
      .values({
        asset_id: asset.id,
        signal_type: 'BUY',
        target_price: '0.50',
        quantity: '1000.0',
        description: null,
        is_active: true
      })
      .execute();

    const result = await getSignals();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].asset.symbol).toEqual('ADA');
  });

  it('should not return signals for assets that do not exist', async () => {
    // This test verifies that our inner join works correctly
    // by not returning signals for non-existent assets
    
    // Create asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'DOT',
        name: 'Polkadot',
        current_price: '6.00'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create signal
    await db.insert(signalsTable)
      .values({
        asset_id: asset.id,
        signal_type: 'BUY',
        target_price: '7.00',
        quantity: '100.0',
        description: 'Polkadot signal',
        is_active: true
      })
      .execute();

    // Delete the asset (this would orphan the signal)
    await db.delete(assetsTable)
      .where(eq(assetsTable.id, asset.id))
      .execute();

    const result = await getSignals();

    // Should return empty array because inner join excludes orphaned signals
    expect(result).toEqual([]);
  });
});