import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { simulatedTradesTable, assetsTable } from '../db/schema';
import { getSimulatedTrades } from '../handlers/get_simulated_trades';
import { eq } from 'drizzle-orm';

describe('getSimulatedTrades', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no trades exist', async () => {
    const result = await getSimulatedTrades();

    expect(result).toEqual([]);
  });

  it('should fetch all simulated trades', async () => {
    // Create test asset first
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: '50000.00'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Create multiple simulated trades
    await db.insert(simulatedTradesTable)
      .values([
        {
          asset_id: assetId,
          trade_type: 'BUY',
          quantity: '1.5000',
          price: '49000.00'
        },
        {
          asset_id: assetId,
          trade_type: 'SELL',
          quantity: '0.7500',
          price: '51000.00'
        },
        {
          asset_id: assetId,
          trade_type: 'BUY',
          quantity: '2.0000',
          price: '48500.00'
        }
      ])
      .execute();

    const result = await getSimulatedTrades();

    // Should return all trades
    expect(result).toHaveLength(3);
    
    // Verify field types and values
    result.forEach(trade => {
      expect(trade.id).toBeDefined();
      expect(trade.asset_id).toEqual(assetId);
      expect(['BUY', 'SELL']).toContain(trade.trade_type);
      expect(typeof trade.quantity).toBe('number');
      expect(typeof trade.price).toBe('number');
      expect(trade.executed_at).toBeInstanceOf(Date);
    });

    // Verify specific trade values
    const buyTrades = result.filter(t => t.trade_type === 'BUY');
    const sellTrades = result.filter(t => t.trade_type === 'SELL');
    
    expect(buyTrades).toHaveLength(2);
    expect(sellTrades).toHaveLength(1);
    
    // Check numeric conversions
    expect(buyTrades.some(t => t.quantity === 1.5)).toBe(true);
    expect(buyTrades.some(t => t.quantity === 2.0)).toBe(true);
    expect(sellTrades[0].quantity).toEqual(0.75);
  });

  it('should return trades ordered by execution time (most recent first)', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ETH',
        name: 'Ethereum',
        current_price: '3000.00'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Create trades with slight delay to ensure different timestamps
    const trade1 = await db.insert(simulatedTradesTable)
      .values({
        asset_id: assetId,
        trade_type: 'BUY',
        quantity: '1.0000',
        price: '3000.00'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const trade2 = await db.insert(simulatedTradesTable)
      .values({
        asset_id: assetId,
        trade_type: 'SELL',
        quantity: '0.5000',
        price: '3100.00'
      })
      .returning()
      .execute();

    const result = await getSimulatedTrades();

    expect(result).toHaveLength(2);
    
    // Most recent trade should be first
    expect(result[0].id).toEqual(trade2[0].id);
    expect(result[1].id).toEqual(trade1[0].id);
    
    // Verify ordering by timestamp
    expect(result[0].executed_at.getTime()).toBeGreaterThanOrEqual(result[1].executed_at.getTime());
  });

  it('should handle trades for multiple assets', async () => {
    // Create multiple test assets
    const asset1Result = await db.insert(assetsTable)
      .values({
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: '50000.00'
      })
      .returning()
      .execute();

    const asset2Result = await db.insert(assetsTable)
      .values({
        symbol: 'ETH',
        name: 'Ethereum',
        current_price: '3000.00'
      })
      .returning()
      .execute();

    const asset1Id = asset1Result[0].id;
    const asset2Id = asset2Result[0].id;

    // Create trades for both assets
    await db.insert(simulatedTradesTable)
      .values([
        {
          asset_id: asset1Id,
          trade_type: 'BUY',
          quantity: '1.0000',
          price: '50000.00'
        },
        {
          asset_id: asset2Id,
          trade_type: 'SELL',
          quantity: '2.0000',
          price: '3000.00'
        },
        {
          asset_id: asset1Id,
          trade_type: 'SELL',
          quantity: '0.5000',
          price: '51000.00'
        }
      ])
      .execute();

    const result = await getSimulatedTrades();

    expect(result).toHaveLength(3);
    
    // Should contain trades for both assets
    const btcTrades = result.filter(t => t.asset_id === asset1Id);
    const ethTrades = result.filter(t => t.asset_id === asset2Id);
    
    expect(btcTrades).toHaveLength(2);
    expect(ethTrades).toHaveLength(1);
  });

  it('should verify trades are saved correctly in database', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ADA',
        name: 'Cardano',
        current_price: '0.50'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Create a simulated trade
    await db.insert(simulatedTradesTable)
      .values({
        asset_id: assetId,
        trade_type: 'BUY',
        quantity: '1000.0000',
        price: '0.4900'
      })
      .execute();

    // Fetch via handler
    const handlerResult = await getSimulatedTrades();
    
    // Verify against direct database query
    const directResult = await db.select()
      .from(simulatedTradesTable)
      .where(eq(simulatedTradesTable.asset_id, assetId))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(directResult).toHaveLength(1);
    
    // Verify handler properly converts numeric fields
    const handlerTrade = handlerResult[0];
    const directTrade = directResult[0];
    
    expect(handlerTrade.quantity).toEqual(1000);
    expect(handlerTrade.price).toEqual(0.49);
    expect(typeof handlerTrade.quantity).toBe('number');
    expect(typeof handlerTrade.price).toBe('number');
    
    // Verify direct query returns strings (pre-conversion)
    expect(typeof directTrade.quantity).toBe('string');
    expect(typeof directTrade.price).toBe('string');
    expect(directTrade.quantity).toEqual('1000.0000');
    expect(directTrade.price).toEqual('0.49');
  });
});