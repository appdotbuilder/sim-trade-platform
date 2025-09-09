import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, signalsTable } from '../db/schema';
import { getActiveSignals } from '../handlers/get_active_signals';

describe('getActiveSignals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no signals exist', async () => {
    const result = await getActiveSignals();
    expect(result).toEqual([]);
  });

  it('should return active signals with asset information', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'BTCUSD',
        name: 'Bitcoin',
        current_price: '50000.00'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create active signal
    await db.insert(signalsTable)
      .values({
        asset_id: asset.id,
        signal_type: 'BUY',
        target_price: '52000.00',
        quantity: '1.5000',
        description: 'Strong bullish signal',
        is_active: true
      })
      .execute();

    const result = await getActiveSignals();

    expect(result).toHaveLength(1);
    
    const signal = result[0];
    expect(signal.signal_type).toEqual('BUY');
    expect(signal.target_price).toEqual(52000);
    expect(signal.quantity).toEqual(1.5);
    expect(signal.description).toEqual('Strong bullish signal');
    expect(signal.is_active).toBe(true);
    expect(signal.asset_id).toEqual(asset.id);
    expect(signal.id).toBeDefined();
    expect(signal.created_at).toBeInstanceOf(Date);
    expect(signal.updated_at).toBeInstanceOf(Date);

    // Verify asset information is included
    expect(signal.asset).toBeDefined();
    expect(signal.asset.id).toEqual(asset.id);
    expect(signal.asset.symbol).toEqual('BTCUSD');
    expect(signal.asset.name).toEqual('Bitcoin');
    expect(signal.asset.current_price).toEqual(50000);
    expect(signal.asset.created_at).toBeInstanceOf(Date);
    expect(signal.asset.updated_at).toBeInstanceOf(Date);
  });

  it('should not return inactive signals', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ETHUSD',
        name: 'Ethereum',
        current_price: '3000.00'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create both active and inactive signals
    await db.insert(signalsTable)
      .values([
        {
          asset_id: asset.id,
          signal_type: 'BUY',
          target_price: '3200.00',
          quantity: '2.0000',
          description: 'Active signal',
          is_active: true
        },
        {
          asset_id: asset.id,
          signal_type: 'SELL',
          target_price: '2800.00',
          quantity: '1.0000',
          description: 'Inactive signal',
          is_active: false
        }
      ])
      .execute();

    const result = await getActiveSignals();

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Active signal');
    expect(result[0].is_active).toBe(true);
  });

  it('should handle multiple active signals from different assets', async () => {
    // Create test assets
    const asset1Result = await db.insert(assetsTable)
      .values({
        symbol: 'BTCUSD',
        name: 'Bitcoin',
        current_price: '50000.00'
      })
      .returning()
      .execute();

    const asset2Result = await db.insert(assetsTable)
      .values({
        symbol: 'ETHUSD',
        name: 'Ethereum',
        current_price: '3000.00'
      })
      .returning()
      .execute();

    const asset1 = asset1Result[0];
    const asset2 = asset2Result[0];

    // Create active signals for both assets
    await db.insert(signalsTable)
      .values([
        {
          asset_id: asset1.id,
          signal_type: 'BUY',
          target_price: '52000.00',
          quantity: '1.0000',
          description: 'Bitcoin buy signal',
          is_active: true
        },
        {
          asset_id: asset2.id,
          signal_type: 'SELL',
          target_price: '2900.00',
          quantity: '2.5000',
          description: 'Ethereum sell signal',
          is_active: true
        }
      ])
      .execute();

    const result = await getActiveSignals();

    expect(result).toHaveLength(2);
    
    // Find signals by asset symbol
    const btcSignal = result.find(s => s.asset.symbol === 'BTCUSD');
    const ethSignal = result.find(s => s.asset.symbol === 'ETHUSD');

    expect(btcSignal).toBeDefined();
    expect(btcSignal!.signal_type).toEqual('BUY');
    expect(btcSignal!.target_price).toEqual(52000);
    expect(btcSignal!.asset.name).toEqual('Bitcoin');

    expect(ethSignal).toBeDefined();
    expect(ethSignal!.signal_type).toEqual('SELL');
    expect(ethSignal!.target_price).toEqual(2900);
    expect(ethSignal!.asset.name).toEqual('Ethereum');
  });

  it('should handle signals with null descriptions', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ADAUSD',
        name: 'Cardano',
        current_price: '1.25'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create signal with null description
    await db.insert(signalsTable)
      .values({
        asset_id: asset.id,
        signal_type: 'BUY',
        target_price: '1.50',
        quantity: '100.0000',
        description: null,
        is_active: true
      })
      .execute();

    const result = await getActiveSignals();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].asset.symbol).toEqual('ADAUSD');
  });

  it('should correctly convert numeric fields to numbers', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'SOLUSD',
        name: 'Solana',
        current_price: '123.45'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Create signal with decimal values
    await db.insert(signalsTable)
      .values({
        asset_id: asset.id,
        signal_type: 'SELL',
        target_price: '125.75',
        quantity: '0.1234',
        description: 'Test precision',
        is_active: true
      })
      .execute();

    const result = await getActiveSignals();

    expect(result).toHaveLength(1);
    
    const signal = result[0];
    
    // Verify types are numbers, not strings
    expect(typeof signal.target_price).toBe('number');
    expect(typeof signal.quantity).toBe('number');
    expect(typeof signal.asset.current_price).toBe('number');
    
    // Verify values are correct
    expect(signal.target_price).toEqual(125.75);
    expect(signal.quantity).toEqual(0.1234);
    expect(signal.asset.current_price).toEqual(123.45);
  });
});