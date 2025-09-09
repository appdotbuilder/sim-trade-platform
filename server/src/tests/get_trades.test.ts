import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradesTable } from '../db/schema';
import { type CreateUserInput, type CreateTradeInput } from '../schema';
import { getUserTrades, getTradeHistory, getActiveTrades } from '../handlers/get_trades';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'trader@example.com',
  username: 'testtrader',
  first_name: 'Test',
  last_name: 'Trader',
  phone: null,
  country: 'US'
};

// Helper function to create a test user
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      phone: testUser.phone,
      country: testUser.country
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create test trades
const createTestTrade = async (userId: number, overrides: Partial<CreateTradeInput> = {}) => {
  const tradeData: CreateTradeInput = {
    user_id: userId,
    symbol: 'BTCUSD',
    asset_type: 'crypto',
    trade_type: 'buy',
    quantity: 0.5,
    entry_price: 45000,
    ...overrides
  };

  const result = await db.insert(tradesTable)
    .values({
      user_id: tradeData.user_id,
      symbol: tradeData.symbol,
      asset_type: tradeData.asset_type,
      trade_type: tradeData.trade_type,
      quantity: tradeData.quantity.toString(),
      entry_price: tradeData.entry_price.toString(),
      status: 'pending'
    })
    .returning()
    .execute();
  return result[0];
};

describe('Trade Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getUserTrades', () => {
    it('should return all trades for a user', async () => {
      const user = await createTestUser();
      
      // Create multiple trades with different statuses
      await createTestTrade(user.id, { symbol: 'BTCUSD', trade_type: 'buy' });
      await createTestTrade(user.id, { symbol: 'ETHUSD', trade_type: 'sell' });
      
      // Update one trade to executed status
      await db.update(tradesTable)
        .set({ status: 'executed', exit_price: '46000.00', profit_loss: '500.00' })
        .where(eq(tradesTable.id, 1))
        .execute();

      const trades = await getUserTrades(user.id);

      expect(trades).toHaveLength(2);
      expect(trades[0].user_id).toEqual(user.id);
      expect(trades[1].user_id).toEqual(user.id);
      
      // Check numeric conversions
      expect(typeof trades[0].quantity).toBe('number');
      expect(typeof trades[0].entry_price).toBe('number');
      expect(trades[0].quantity).toEqual(0.5);
      expect(trades[0].entry_price).toEqual(45000);
      
      // Check executed trade has proper numeric conversions for exit_price and profit_loss
      const executedTrade = trades.find(t => t.status === 'executed');
      if (executedTrade) {
        expect(typeof executedTrade.exit_price).toBe('number');
        expect(typeof executedTrade.profit_loss).toBe('number');
        expect(executedTrade.exit_price).toEqual(46000);
        expect(executedTrade.profit_loss).toEqual(500);
      }
    });

    it('should return empty array for user with no trades', async () => {
      const user = await createTestUser();
      const trades = await getUserTrades(user.id);
      
      expect(trades).toHaveLength(0);
    });

    it('should return trades ordered by creation date (newest first)', async () => {
      const user = await createTestUser();
      
      // Create trades with slight delay to ensure different timestamps
      const trade1 = await createTestTrade(user.id, { symbol: 'BTCUSD' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const trade2 = await createTestTrade(user.id, { symbol: 'ETHUSD' });
      
      const trades = await getUserTrades(user.id);
      
      expect(trades).toHaveLength(2);
      expect(trades[0].symbol).toEqual('ETHUSD'); // Newer trade first
      expect(trades[1].symbol).toEqual('BTCUSD');
      expect(trades[0].created_at >= trades[1].created_at).toBe(true);
    });

    it('should only return trades for the specified user', async () => {
      const user1 = await createTestUser();
      const user2 = await db.insert(usersTable)
        .values({
          email: 'trader2@example.com',
          username: 'testtrader2',
          first_name: 'Test2',
          last_name: 'Trader2'
        })
        .returning()
        .execute();
      
      await createTestTrade(user1.id, { symbol: 'BTCUSD' });
      await createTestTrade(user2[0].id, { symbol: 'ETHUSD' });
      
      const user1Trades = await getUserTrades(user1.id);
      const user2Trades = await getUserTrades(user2[0].id);
      
      expect(user1Trades).toHaveLength(1);
      expect(user2Trades).toHaveLength(1);
      expect(user1Trades[0].symbol).toEqual('BTCUSD');
      expect(user2Trades[0].symbol).toEqual('ETHUSD');
    });
  });

  describe('getTradeHistory', () => {
    it('should return trade history without limit', async () => {
      const user = await createTestUser();
      
      // Create 3 trades
      await createTestTrade(user.id, { symbol: 'BTCUSD' });
      await createTestTrade(user.id, { symbol: 'ETHUSD' });
      await createTestTrade(user.id, { symbol: 'ADAUSD' });
      
      const trades = await getTradeHistory(user.id);
      
      expect(trades).toHaveLength(3);
      expect(trades.every(trade => trade.user_id === user.id)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const user = await createTestUser();
      
      // Create 5 trades
      for (let i = 0; i < 5; i++) {
        await createTestTrade(user.id, { symbol: `TEST${i}USD` });
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      const limitedTrades = await getTradeHistory(user.id, 3);
      
      expect(limitedTrades).toHaveLength(3);
      expect(limitedTrades.every(trade => trade.user_id === user.id)).toBe(true);
    });

    it('should return trades ordered by creation date (newest first)', async () => {
      const user = await createTestUser();
      
      await createTestTrade(user.id, { symbol: 'BTCUSD' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestTrade(user.id, { symbol: 'ETHUSD' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestTrade(user.id, { symbol: 'ADAUSD' });
      
      const trades = await getTradeHistory(user.id, 2);
      
      expect(trades).toHaveLength(2);
      expect(trades[0].symbol).toEqual('ADAUSD'); // Most recent
      expect(trades[1].symbol).toEqual('ETHUSD'); // Second most recent
    });

    it('should handle numeric conversions correctly', async () => {
      const user = await createTestUser();
      await createTestTrade(user.id, { 
        quantity: 1.25, 
        entry_price: 45000.50 
      });
      
      const trades = await getTradeHistory(user.id, 1);
      
      expect(trades).toHaveLength(1);
      expect(typeof trades[0].quantity).toBe('number');
      expect(typeof trades[0].entry_price).toBe('number');
      expect(trades[0].quantity).toEqual(1.25);
      expect(trades[0].entry_price).toEqual(45000.50);
    });
  });

  describe('getActiveTrades', () => {
    it('should return only executed trades', async () => {
      const user = await createTestUser();
      
      // Create trades with different statuses
      const trade1 = await createTestTrade(user.id, { symbol: 'BTCUSD' });
      const trade2 = await createTestTrade(user.id, { symbol: 'ETHUSD' });
      const trade3 = await createTestTrade(user.id, { symbol: 'ADAUSD' });
      
      // Update trade statuses
      await db.update(tradesTable)
        .set({ status: 'executed' })
        .where(eq(tradesTable.id, trade1.id))
        .execute();
      
      await db.update(tradesTable)
        .set({ status: 'cancelled' })
        .where(eq(tradesTable.id, trade2.id))
        .execute();
        
      await db.update(tradesTable)
        .set({ status: 'executed' })
        .where(eq(tradesTable.id, trade3.id))
        .execute();
      
      const activeTrades = await getActiveTrades(user.id);
      
      expect(activeTrades).toHaveLength(2);
      expect(activeTrades.every(trade => trade.status === 'executed')).toBe(true);
      expect(activeTrades.every(trade => trade.user_id === user.id)).toBe(true);
    });

    it('should return empty array when no active trades exist', async () => {
      const user = await createTestUser();
      
      // Create trades but don't execute them
      await createTestTrade(user.id, { symbol: 'BTCUSD' });
      await createTestTrade(user.id, { symbol: 'ETHUSD' });
      
      const activeTrades = await getActiveTrades(user.id);
      
      expect(activeTrades).toHaveLength(0);
    });

    it('should return active trades ordered by creation date (newest first)', async () => {
      const user = await createTestUser();
      
      const trade1 = await createTestTrade(user.id, { symbol: 'BTCUSD' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const trade2 = await createTestTrade(user.id, { symbol: 'ETHUSD' });
      
      // Execute both trades
      await db.update(tradesTable)
        .set({ status: 'executed' })
        .where(eq(tradesTable.id, trade1.id))
        .execute();
        
      await db.update(tradesTable)
        .set({ status: 'executed' })
        .where(eq(tradesTable.id, trade2.id))
        .execute();
      
      const activeTrades = await getActiveTrades(user.id);
      
      expect(activeTrades).toHaveLength(2);
      expect(activeTrades[0].symbol).toEqual('ETHUSD'); // Newer trade first
      expect(activeTrades[1].symbol).toEqual('BTCUSD');
    });

    it('should only return active trades for the specified user', async () => {
      const user1 = await createTestUser();
      const user2 = await db.insert(usersTable)
        .values({
          email: 'trader2@example.com',
          username: 'testtrader2',
          first_name: 'Test2',
          last_name: 'Trader2'
        })
        .returning()
        .execute();
      
      const trade1 = await createTestTrade(user1.id, { symbol: 'BTCUSD' });
      const trade2 = await createTestTrade(user2[0].id, { symbol: 'ETHUSD' });
      
      // Execute both trades
      await db.update(tradesTable)
        .set({ status: 'executed' })
        .where(eq(tradesTable.id, trade1.id))
        .execute();
        
      await db.update(tradesTable)
        .set({ status: 'executed' })
        .where(eq(tradesTable.id, trade2.id))
        .execute();
      
      const user1ActiveTrades = await getActiveTrades(user1.id);
      const user2ActiveTrades = await getActiveTrades(user2[0].id);
      
      expect(user1ActiveTrades).toHaveLength(1);
      expect(user2ActiveTrades).toHaveLength(1);
      expect(user1ActiveTrades[0].symbol).toEqual('BTCUSD');
      expect(user2ActiveTrades[0].symbol).toEqual('ETHUSD');
    });

    it('should handle numeric conversions for active trades', async () => {
      const user = await createTestUser();
      const trade = await createTestTrade(user.id, {
        quantity: 2.75,
        entry_price: 42500.25
      });
      
      // Execute and add exit details
      await db.update(tradesTable)
        .set({ 
          status: 'executed',
          exit_price: '43000.50',
          profit_loss: '1375.69'
        })
        .where(eq(tradesTable.id, trade.id))
        .execute();
      
      const activeTrades = await getActiveTrades(user.id);
      
      expect(activeTrades).toHaveLength(1);
      expect(typeof activeTrades[0].quantity).toBe('number');
      expect(typeof activeTrades[0].entry_price).toBe('number');
      expect(typeof activeTrades[0].exit_price).toBe('number');
      expect(typeof activeTrades[0].profit_loss).toBe('number');
      
      expect(activeTrades[0].quantity).toEqual(2.75);
      expect(activeTrades[0].entry_price).toEqual(42500.25);
      expect(activeTrades[0].exit_price).toEqual(43000.50);
      expect(activeTrades[0].profit_loss).toEqual(1375.69);
    });
  });
});