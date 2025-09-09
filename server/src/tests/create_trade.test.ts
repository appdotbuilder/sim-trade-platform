import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tradesTable, usersTable } from '../db/schema';
import { type CreateTradeInput } from '../schema';
import { createTrade } from '../handlers/create_trade';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'trader@example.com',
  username: 'testtrader',
  first_name: 'Test',
  last_name: 'Trader',
  phone: '+1234567890',
  country: 'US'
};

// Test trade input for buy order
const buyTradeInput: CreateTradeInput = {
  user_id: 1,
  symbol: 'BTCUSD',
  asset_type: 'crypto',
  trade_type: 'buy',
  quantity: 0.5,
  entry_price: 50000
};

// Test trade input for sell order
const sellTradeInput: CreateTradeInput = {
  user_id: 1,
  symbol: 'ETHUSD',
  asset_type: 'crypto',
  trade_type: 'sell',
  quantity: 2,
  entry_price: 3000
};

describe('createTrade', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a buy trade successfully', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: '100000.00' // Sufficient balance
      })
      .execute();

    const result = await createTrade(buyTradeInput);

    // Validate trade properties
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(1);
    expect(result.symbol).toEqual('BTCUSD');
    expect(result.asset_type).toEqual('crypto');
    expect(result.trade_type).toEqual('buy');
    expect(result.quantity).toEqual(0.5);
    expect(result.entry_price).toEqual(50000);
    expect(result.status).toEqual('executed');
    expect(result.exit_price).toBeNull();
    expect(result.profit_loss).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.closed_at).toBeNull();
  });

  it('should create a sell trade successfully', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: '50000.00'
      })
      .execute();

    const result = await createTrade(sellTradeInput);

    // Validate trade properties
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(1);
    expect(result.symbol).toEqual('ETHUSD');
    expect(result.asset_type).toEqual('crypto');
    expect(result.trade_type).toEqual('sell');
    expect(result.quantity).toEqual(2);
    expect(result.entry_price).toEqual(3000);
    expect(result.status).toEqual('executed');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save trade to database correctly', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: '100000.00'
      })
      .execute();

    const result = await createTrade(buyTradeInput);

    // Verify trade is saved in database
    const trades = await db.select()
      .from(tradesTable)
      .where(eq(tradesTable.id, result.id))
      .execute();

    expect(trades).toHaveLength(1);
    expect(trades[0].user_id).toEqual(1);
    expect(trades[0].symbol).toEqual('BTCUSD');
    expect(parseFloat(trades[0].quantity)).toEqual(0.5);
    expect(parseFloat(trades[0].entry_price)).toEqual(50000);
    expect(trades[0].status).toEqual('executed');
  });

  it('should update user virtual balance for buy trade', async () => {
    const initialBalance = 100000;
    
    // Create test user with specific balance
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: initialBalance.toString()
      })
      .execute();

    await createTrade(buyTradeInput);

    // Check updated balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();

    const expectedBalance = initialBalance - (buyTradeInput.quantity * buyTradeInput.entry_price);
    expect(parseFloat(users[0].virtual_balance)).toEqual(expectedBalance);
  });

  it('should update user virtual balance for sell trade', async () => {
    const initialBalance = 50000;
    
    // Create test user with specific balance
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: initialBalance.toString()
      })
      .execute();

    await createTrade(sellTradeInput);

    // Check updated balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();

    const expectedBalance = initialBalance + (sellTradeInput.quantity * sellTradeInput.entry_price);
    expect(parseFloat(users[0].virtual_balance)).toEqual(expectedBalance);
  });

  it('should throw error for insufficient balance on buy trade', async () => {
    // Create test user with insufficient balance
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: '1000.00' // Insufficient for buy trade (0.5 * 50000 = 25000)
      })
      .execute();

    await expect(createTrade(buyTradeInput))
      .rejects.toThrow(/insufficient virtual balance/i);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserTrade: CreateTradeInput = {
      ...buyTradeInput,
      user_id: 999
    };

    await expect(createTrade(nonExistentUserTrade))
      .rejects.toThrow(/user with id 999 not found/i);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: '100000.00'
      })
      .execute();

    const result = await createTrade(buyTradeInput);

    // Verify all numeric fields are proper numbers
    expect(typeof result.quantity).toBe('number');
    expect(typeof result.entry_price).toBe('number');
    expect(result.exit_price === null || typeof result.exit_price === 'number').toBe(true);
    expect(result.profit_loss === null || typeof result.profit_loss === 'number').toBe(true);
  });

  it('should create trades with different asset types', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        ...testUser,
        virtual_balance: '100000.00'
      })
      .execute();

    const stockTrade: CreateTradeInput = {
      user_id: 1,
      symbol: 'AAPL',
      asset_type: 'stock',
      trade_type: 'buy',
      quantity: 10,
      entry_price: 150
    };

    const forexTrade: CreateTradeInput = {
      user_id: 1,
      symbol: 'EURUSD',
      asset_type: 'forex',
      trade_type: 'sell',
      quantity: 1000,
      entry_price: 1.1
    };

    const stockResult = await createTrade(stockTrade);
    const forexResult = await createTrade(forexTrade);

    expect(stockResult.asset_type).toEqual('stock');
    expect(stockResult.symbol).toEqual('AAPL');
    expect(forexResult.asset_type).toEqual('forex');
    expect(forexResult.symbol).toEqual('EURUSD');
  });
});