import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tradesTable, usersTable } from '../db/schema';
import { type CloseTradeInput } from '../schema';
import { closeTrade } from '../handlers/close_trade';
import { eq } from 'drizzle-orm';

describe('closeTrade', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        virtual_balance: '10000.00'
      })
      .returning()
      .execute();
    return users[0];
  };

  // Helper function to create a test trade
  const createTestTrade = async (userId: number, tradeType: 'buy' | 'sell' = 'buy') => {
    const trades = await db.insert(tradesTable)
      .values({
        user_id: userId,
        symbol: 'BTC/USD',
        asset_type: 'crypto',
        trade_type: tradeType,
        quantity: '1.0',
        entry_price: '50000.00',
        status: 'executed'
      })
      .returning()
      .execute();
    return trades[0];
  };

  it('should close a buy trade with profit', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id, 'buy');

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 55000.00 // Higher than entry price for profit
    };

    const result = await closeTrade(input);

    // Verify trade details
    expect(result.id).toEqual(trade.id);
    expect(result.status).toEqual('closed');
    expect(result.exit_price).toEqual(55000.00);
    expect(result.profit_loss).toEqual(5000.00); // (55000 - 50000) * 1.0
    expect(result.closed_at).toBeInstanceOf(Date);
    expect(typeof result.quantity).toBe('number');
    expect(typeof result.entry_price).toBe('number');
    expect(typeof result.exit_price).toBe('number');
    expect(typeof result.profit_loss).toBe('number');
  });

  it('should close a buy trade with loss', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id, 'buy');

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 45000.00 // Lower than entry price for loss
    };

    const result = await closeTrade(input);

    expect(result.status).toEqual('closed');
    expect(result.exit_price).toEqual(45000.00);
    expect(result.profit_loss).toEqual(-5000.00); // (45000 - 50000) * 1.0
    expect(result.closed_at).toBeInstanceOf(Date);
  });

  it('should close a sell trade with profit', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id, 'sell');

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 45000.00 // Lower than entry price for sell profit
    };

    const result = await closeTrade(input);

    expect(result.status).toEqual('closed');
    expect(result.exit_price).toEqual(45000.00);
    expect(result.profit_loss).toEqual(5000.00); // (50000 - 45000) * 1.0 for sell
    expect(result.closed_at).toBeInstanceOf(Date);
  });

  it('should close a sell trade with loss', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id, 'sell');

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 55000.00 // Higher than entry price for sell loss
    };

    const result = await closeTrade(input);

    expect(result.status).toEqual('closed');
    expect(result.exit_price).toEqual(55000.00);
    expect(result.profit_loss).toEqual(-5000.00); // (50000 - 55000) * 1.0 for sell
  });

  it('should update user virtual balance correctly with profit', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id, 'buy');
    const initialBalance = parseFloat(user.virtual_balance);

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 55000.00 // Profit of 5000
    };

    await closeTrade(input);

    // Check updated user balance
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    const updatedBalance = parseFloat(updatedUsers[0].virtual_balance);
    expect(updatedBalance).toEqual(initialBalance + 5000.00);
  });

  it('should update user virtual balance correctly with loss', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id, 'buy');
    const initialBalance = parseFloat(user.virtual_balance);

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 45000.00 // Loss of 5000
    };

    await closeTrade(input);

    // Check updated user balance
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    const updatedBalance = parseFloat(updatedUsers[0].virtual_balance);
    expect(updatedBalance).toEqual(initialBalance - 5000.00);
  });

  it('should save closed trade to database with correct status', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id);

    const input: CloseTradeInput = {
      id: trade.id,
      exit_price: 55000.00
    };

    const result = await closeTrade(input);

    // Query database to verify trade was updated
    const trades = await db.select()
      .from(tradesTable)
      .where(eq(tradesTable.id, result.id))
      .execute();

    expect(trades).toHaveLength(1);
    const savedTrade = trades[0];
    expect(savedTrade.status).toEqual('closed');
    expect(parseFloat(savedTrade.exit_price!)).toEqual(55000.00);
    expect(parseFloat(savedTrade.profit_loss!)).toEqual(5000.00);
    expect(savedTrade.closed_at).toBeInstanceOf(Date);
  });

  it('should handle trades with different quantities correctly', async () => {
    const user = await createTestUser();
    
    // Create trade with quantity 2.5
    const trades = await db.insert(tradesTable)
      .values({
        user_id: user.id,
        symbol: 'ETH/USD',
        asset_type: 'crypto',
        trade_type: 'buy',
        quantity: '2.5',
        entry_price: '2000.00',
        status: 'executed'
      })
      .returning()
      .execute();

    const input: CloseTradeInput = {
      id: trades[0].id,
      exit_price: 2200.00 // Profit of 200 per unit
    };

    const result = await closeTrade(input);

    expect(result.profit_loss).toEqual(500.00); // (2200 - 2000) * 2.5
  });

  it('should throw error when trade does not exist', async () => {
    const input: CloseTradeInput = {
      id: 999, // Non-existent trade ID
      exit_price: 55000.00
    };

    expect(closeTrade(input)).rejects.toThrow(/trade not found/i);
  });

  it('should throw error when trying to close already closed trade', async () => {
    const user = await createTestUser();
    const trade = await createTestTrade(user.id);

    // First close the trade
    const firstInput: CloseTradeInput = {
      id: trade.id,
      exit_price: 55000.00
    };

    await closeTrade(firstInput);

    // Try to close it again
    const secondInput: CloseTradeInput = {
      id: trade.id,
      exit_price: 60000.00
    };

    expect(closeTrade(secondInput)).rejects.toThrow(/already closed/i);
  });

  it('should throw error when trying to close cancelled trade', async () => {
    const user = await createTestUser();
    
    // Create cancelled trade
    const trades = await db.insert(tradesTable)
      .values({
        user_id: user.id,
        symbol: 'BTC/USD',
        asset_type: 'crypto',
        trade_type: 'buy',
        quantity: '1.0',
        entry_price: '50000.00',
        status: 'cancelled'
      })
      .returning()
      .execute();

    const input: CloseTradeInput = {
      id: trades[0].id,
      exit_price: 55000.00
    };

    expect(closeTrade(input)).rejects.toThrow(/already closed or cancelled/i);
  });
});