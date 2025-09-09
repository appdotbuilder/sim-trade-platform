import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, simulatedTradesTable } from '../db/schema';
import { type ExecuteTradeInput } from '../schema';
import { executeTrade } from '../handlers/execute_trade';
import { eq } from 'drizzle-orm';

describe('executeTrade', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testAssetId: number;

  beforeEach(async () => {
    // Create a test asset for trade execution
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: '150.25'
      })
      .returning()
      .execute();
    
    testAssetId = assetResult[0].id;
  });

  it('should execute a BUY trade successfully', async () => {
    const testInput: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'BUY',
      quantity: 10.5
    };

    const result = await executeTrade(testInput);

    // Verify trade details
    expect(result.asset_id).toEqual(testAssetId);
    expect(result.trade_type).toEqual('BUY');
    expect(result.quantity).toEqual(10.5);
    expect(result.price).toEqual(150.25); // Should use current asset price
    expect(result.id).toBeDefined();
    expect(result.executed_at).toBeInstanceOf(Date);
    
    // Verify types
    expect(typeof result.quantity).toBe('number');
    expect(typeof result.price).toBe('number');
  });

  it('should execute a SELL trade successfully', async () => {
    const testInput: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'SELL',
      quantity: 5.25
    };

    const result = await executeTrade(testInput);

    // Verify trade details
    expect(result.asset_id).toEqual(testAssetId);
    expect(result.trade_type).toEqual('SELL');
    expect(result.quantity).toEqual(5.25);
    expect(result.price).toEqual(150.25);
    expect(result.id).toBeDefined();
    expect(result.executed_at).toBeInstanceOf(Date);
  });

  it('should save trade to database correctly', async () => {
    const testInput: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'BUY',
      quantity: 7.75
    };

    const result = await executeTrade(testInput);

    // Query database to verify trade was saved
    const trades = await db.select()
      .from(simulatedTradesTable)
      .where(eq(simulatedTradesTable.id, result.id))
      .execute();

    expect(trades).toHaveLength(1);
    expect(trades[0].asset_id).toEqual(testAssetId);
    expect(trades[0].trade_type).toEqual('BUY');
    expect(parseFloat(trades[0].quantity)).toEqual(7.75);
    expect(parseFloat(trades[0].price)).toEqual(150.25);
    expect(trades[0].executed_at).toBeInstanceOf(Date);
  });

  it('should use current asset price at execution time', async () => {
    // Update the asset price
    await db.update(assetsTable)
      .set({ current_price: '99.99', updated_at: new Date() })
      .where(eq(assetsTable.id, testAssetId))
      .execute();

    const testInput: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'SELL',
      quantity: 3.0
    };

    const result = await executeTrade(testInput);

    // Should use the updated price
    expect(result.price).toEqual(99.99);
  });

  it('should handle fractional quantities correctly', async () => {
    const testInput: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'BUY',
      quantity: 0.0001 // Very small fractional quantity
    };

    const result = await executeTrade(testInput);

    expect(result.quantity).toEqual(0.0001);
    expect(typeof result.quantity).toBe('number');
  });

  it('should throw error when asset does not exist', async () => {
    const testInput: ExecuteTradeInput = {
      asset_id: 99999, // Non-existent asset ID
      trade_type: 'BUY',
      quantity: 10.0
    };

    await expect(executeTrade(testInput)).rejects.toThrow(/Asset with ID 99999 not found/i);
  });

  it('should handle multiple trades for the same asset', async () => {
    const trade1Input: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'BUY',
      quantity: 5.0
    };

    const trade2Input: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'SELL',
      quantity: 2.5
    };

    const result1 = await executeTrade(trade1Input);
    const result2 = await executeTrade(trade2Input);

    // Verify both trades were created
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.trade_type).toEqual('BUY');
    expect(result2.trade_type).toEqual('SELL');

    // Verify both trades are in database
    const allTrades = await db.select()
      .from(simulatedTradesTable)
      .where(eq(simulatedTradesTable.asset_id, testAssetId))
      .execute();

    expect(allTrades).toHaveLength(2);
  });

  it('should preserve execution timestamp accuracy', async () => {
    const beforeExecution = new Date();
    
    const testInput: ExecuteTradeInput = {
      asset_id: testAssetId,
      trade_type: 'BUY',
      quantity: 1.0
    };

    const result = await executeTrade(testInput);
    
    const afterExecution = new Date();

    // Execution timestamp should be between before and after
    expect(result.executed_at >= beforeExecution).toBe(true);
    expect(result.executed_at <= afterExecution).toBe(true);
  });
});