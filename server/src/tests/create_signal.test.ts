import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { signalsTable, usersTable, tradersTable } from '../db/schema';
import { type CreateSignalInput } from '../schema';
import { createSignal } from '../handlers/create_signal';
import { eq } from 'drizzle-orm';

describe('createSignal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test trader
  const createTestTrader = async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'testtrader',
        first_name: 'Test',
        last_name: 'Trader'
      })
      .returning()
      .execute();

    // Then create a trader profile
    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: userResult[0].id,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();

    return traderResult[0];
  };

  const testInput: CreateSignalInput = {
    trader_id: 0, // Will be set in tests
    symbol: 'BTCUSD',
    asset_type: 'crypto',
    signal_type: 'buy',
    entry_price: 45000.50,
    stop_loss: 43000.00,
    take_profit: 50000.00,
    description: 'Strong bullish signal on BTC',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };

  it('should create a signal with all fields', async () => {
    const trader = await createTestTrader();
    const input = { ...testInput, trader_id: trader.id };

    const result = await createSignal(input);

    // Basic field validation
    expect(result.trader_id).toEqual(trader.id);
    expect(result.symbol).toEqual('BTCUSD');
    expect(result.asset_type).toEqual('crypto');
    expect(result.signal_type).toEqual('buy');
    expect(result.entry_price).toEqual(45000.50);
    expect(typeof result.entry_price).toEqual('number');
    expect(result.stop_loss).toEqual(43000.00);
    expect(typeof result.stop_loss).toEqual('number');
    expect(result.take_profit).toEqual(50000.00);
    expect(typeof result.take_profit).toEqual('number');
    expect(result.description).toEqual('Strong bullish signal on BTC');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);
  });

  it('should create a signal with minimal required fields', async () => {
    const trader = await createTestTrader();
    const minimalInput: CreateSignalInput = {
      trader_id: trader.id,
      symbol: 'ETHUSD',
      asset_type: 'crypto',
      signal_type: 'sell',
      entry_price: 2800.75
    };

    const result = await createSignal(minimalInput);

    expect(result.trader_id).toEqual(trader.id);
    expect(result.symbol).toEqual('ETHUSD');
    expect(result.asset_type).toEqual('crypto');
    expect(result.signal_type).toEqual('sell');
    expect(result.entry_price).toEqual(2800.75);
    expect(result.stop_loss).toBeNull();
    expect(result.take_profit).toBeNull();
    expect(result.description).toBeNull();
    expect(result.expires_at).toBeNull();
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save signal to database with correct numeric conversions', async () => {
    const trader = await createTestTrader();
    const input = { ...testInput, trader_id: trader.id };

    const result = await createSignal(input);

    // Query the database to verify the signal was saved correctly
    const signals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, result.id))
      .execute();

    expect(signals).toHaveLength(1);
    const savedSignal = signals[0];
    expect(savedSignal.trader_id).toEqual(trader.id);
    expect(savedSignal.symbol).toEqual('BTCUSD');
    expect(savedSignal.asset_type).toEqual('crypto');
    expect(savedSignal.signal_type).toEqual('buy');
    expect(parseFloat(savedSignal.entry_price)).toEqual(45000.50);
    expect(parseFloat(savedSignal.stop_loss!)).toEqual(43000.00);
    expect(parseFloat(savedSignal.take_profit!)).toEqual(50000.00);
    expect(savedSignal.description).toEqual('Strong bullish signal on BTC');
    expect(savedSignal.is_active).toEqual(true);
    expect(savedSignal.created_at).toBeInstanceOf(Date);
    expect(savedSignal.expires_at).toBeInstanceOf(Date);
  });

  it('should create multiple signals for different assets', async () => {
    const trader = await createTestTrader();

    const cryptoSignal = await createSignal({
      trader_id: trader.id,
      symbol: 'BTCUSD',
      asset_type: 'crypto',
      signal_type: 'buy',
      entry_price: 45000
    });

    const stockSignal = await createSignal({
      trader_id: trader.id,
      symbol: 'AAPL',
      asset_type: 'stock',
      signal_type: 'sell',
      entry_price: 150.25
    });

    const forexSignal = await createSignal({
      trader_id: trader.id,
      symbol: 'EURUSD',
      asset_type: 'forex',
      signal_type: 'buy',
      entry_price: 1.0850
    });

    // Verify all signals were created with correct asset types
    expect(cryptoSignal.asset_type).toEqual('crypto');
    expect(cryptoSignal.symbol).toEqual('BTCUSD');

    expect(stockSignal.asset_type).toEqual('stock');
    expect(stockSignal.symbol).toEqual('AAPL');

    expect(forexSignal.asset_type).toEqual('forex');
    expect(forexSignal.symbol).toEqual('EURUSD');

    // Verify all signals are in database
    const allSignals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.trader_id, trader.id))
      .execute();

    expect(allSignals).toHaveLength(3);
  });

  it('should throw error when trader does not exist', async () => {
    const nonExistentTraderId = 99999;
    const input = { ...testInput, trader_id: nonExistentTraderId };

    await expect(createSignal(input)).rejects.toThrow(/trader not found/i);
  });

  it('should handle precision correctly for forex prices', async () => {
    const trader = await createTestTrader();
    const forexInput: CreateSignalInput = {
      trader_id: trader.id,
      symbol: 'GBPJPY',
      asset_type: 'forex',
      signal_type: 'buy',
      entry_price: 189.12345,
      stop_loss: 188.50000,
      take_profit: 190.75000
    };

    const result = await createSignal(forexInput);

    expect(result.entry_price).toEqual(189.12345);
    expect(result.stop_loss).toEqual(188.50000);
    expect(result.take_profit).toEqual(190.75000);

    // Verify precision is maintained in database
    const signals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, result.id))
      .execute();

    const savedSignal = signals[0];
    expect(parseFloat(savedSignal.entry_price)).toEqual(189.12345);
    expect(parseFloat(savedSignal.stop_loss!)).toEqual(188.50000);
    expect(parseFloat(savedSignal.take_profit!)).toEqual(190.75000);
  });

  it('should create signals with future expiration dates', async () => {
    const trader = await createTestTrader();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const input: CreateSignalInput = {
      trader_id: trader.id,
      symbol: 'TSLA',
      asset_type: 'stock',
      signal_type: 'buy',
      entry_price: 250.00,
      expires_at: futureDate
    };

    const result = await createSignal(input);

    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at!.getTime()).toBeCloseTo(futureDate.getTime(), -3); // Within 1 second tolerance

    // Verify expiration date is saved correctly
    const signals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, result.id))
      .execute();

    expect(signals[0].expires_at).toBeInstanceOf(Date);
    expect(signals[0].expires_at!.getTime()).toBeCloseTo(futureDate.getTime(), -3);
  });
});