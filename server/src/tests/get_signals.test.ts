import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradersTable, subscriptionsTable, signalsTable } from '../db/schema';
import { type CreateUserInput, type CreateTraderInput, type CreateSubscriptionInput, type CreateSignalInput } from '../schema';
import { getUserSignals, getActiveSignals, getTraderSignals } from '../handlers/get_signals';
import { eq } from 'drizzle-orm';

// Test data
const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  username: 'user1',
  first_name: 'User',
  last_name: 'One',
  phone: '+1234567890',
  country: 'US'
};

const testUser2: CreateUserInput = {
  email: 'user2@example.com',
  username: 'user2',
  first_name: 'User',
  last_name: 'Two',
  phone: '+1234567891',
  country: 'US'
};

const testTrader1: CreateTraderInput = {
  user_id: 1,
  display_name: 'Trader One',
  bio: 'Professional trader',
  subscription_price: 100
};

const testTrader2: CreateTraderInput = {
  user_id: 2,
  display_name: 'Trader Two',
  bio: 'Expert trader',
  subscription_price: 200
};

const testSignal1: CreateSignalInput = {
  trader_id: 1,
  symbol: 'BTC/USD',
  asset_type: 'crypto',
  signal_type: 'buy',
  entry_price: 50000,
  stop_loss: 48000,
  take_profit: 55000,
  description: 'Strong bullish signal'
};

const testSignal2: CreateSignalInput = {
  trader_id: 1,
  symbol: 'ETH/USD',
  asset_type: 'crypto',
  signal_type: 'sell',
  entry_price: 3000,
  stop_loss: 3200,
  take_profit: 2800,
  description: 'Bearish trend expected'
};

const testSignal3: CreateSignalInput = {
  trader_id: 2,
  symbol: 'AAPL',
  asset_type: 'stock',
  signal_type: 'buy',
  entry_price: 150,
  stop_loss: 145,
  take_profit: 160,
  description: 'Apple stock long position'
};

describe('Signal Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        email: testUser1.email,
        username: testUser1.username,
        first_name: testUser1.first_name,
        last_name: testUser1.last_name,
        phone: testUser1.phone,
        country: testUser1.country,
        virtual_balance: '10000.00'
      },
      {
        email: testUser2.email,
        username: testUser2.username,
        first_name: testUser2.first_name,
        last_name: testUser2.last_name,
        phone: testUser2.phone,
        country: testUser2.country,
        virtual_balance: '10000.00'
      }
    ]).execute();

    // Create test traders
    await db.insert(tradersTable).values([
      {
        user_id: testTrader1.user_id,
        display_name: testTrader1.display_name,
        bio: testTrader1.bio,
        subscription_price: testTrader1.subscription_price.toString()
      },
      {
        user_id: testTrader2.user_id,
        display_name: testTrader2.display_name,
        bio: testTrader2.bio,
        subscription_price: testTrader2.subscription_price.toString()
      }
    ]).execute();

    // Create test subscription (user1 subscribes to trader1)
    await db.insert(subscriptionsTable).values({
      subscriber_id: 1,
      trader_id: 1,
      status: 'active',
      price_paid: '100.00'
    }).execute();

    // Create test signals
    await db.insert(signalsTable).values([
      {
        trader_id: testSignal1.trader_id,
        symbol: testSignal1.symbol,
        asset_type: testSignal1.asset_type,
        signal_type: testSignal1.signal_type,
        entry_price: testSignal1.entry_price.toString(),
        stop_loss: testSignal1.stop_loss?.toString(),
        take_profit: testSignal1.take_profit?.toString(),
        description: testSignal1.description,
        is_active: true
      },
      {
        trader_id: testSignal2.trader_id,
        symbol: testSignal2.symbol,
        asset_type: testSignal2.asset_type,
        signal_type: testSignal2.signal_type,
        entry_price: testSignal2.entry_price.toString(),
        stop_loss: testSignal2.stop_loss?.toString(),
        take_profit: testSignal2.take_profit?.toString(),
        description: testSignal2.description,
        is_active: true
      },
      {
        trader_id: testSignal3.trader_id,
        symbol: testSignal3.symbol,
        asset_type: testSignal3.asset_type,
        signal_type: testSignal3.signal_type,
        entry_price: testSignal3.entry_price.toString(),
        stop_loss: testSignal3.stop_loss?.toString(),
        take_profit: testSignal3.take_profit?.toString(),
        description: testSignal3.description,
        is_active: true
      }
    ]).execute();
  });

  describe('getUserSignals', () => {
    it('should return signals from subscribed traders', async () => {
      const signals = await getUserSignals(1);

      expect(signals).toHaveLength(2);
      
      // Check first signal
      expect(signals[0].symbol).toEqual('BTC/USD');
      expect(signals[0].asset_type).toEqual('crypto');
      expect(signals[0].signal_type).toEqual('buy');
      expect(signals[0].entry_price).toEqual(50000);
      expect(signals[0].stop_loss).toEqual(48000);
      expect(signals[0].take_profit).toEqual(55000);
      expect(signals[0].description).toEqual('Strong bullish signal');
      expect(signals[0].is_active).toBe(true);
      expect(signals[0].trader_id).toEqual(1);
      expect(signals[0].created_at).toBeInstanceOf(Date);
      expect(typeof signals[0].entry_price).toBe('number');
      expect(typeof signals[0].stop_loss).toBe('number');
      expect(typeof signals[0].take_profit).toBe('number');

      // Check second signal
      expect(signals[1].symbol).toEqual('ETH/USD');
      expect(signals[1].signal_type).toEqual('sell');
      expect(signals[1].entry_price).toEqual(3000);
    });

    it('should return empty array for user with no subscriptions', async () => {
      const signals = await getUserSignals(2);
      expect(signals).toHaveLength(0);
    });

    it('should not return signals from expired subscriptions', async () => {
      // Update subscription to expired
      await db.update(subscriptionsTable)
        .set({ status: 'expired' })
        .where(eq(subscriptionsTable.subscriber_id, 1))
        .execute();

      const signals = await getUserSignals(1);
      expect(signals).toHaveLength(0);
    });

    it('should not return signals from cancelled subscriptions', async () => {
      // Update subscription to cancelled
      await db.update(subscriptionsTable)
        .set({ status: 'cancelled' })
        .where(eq(subscriptionsTable.subscriber_id, 1))
        .execute();

      const signals = await getUserSignals(1);
      expect(signals).toHaveLength(0);
    });
  });

  describe('getActiveSignals', () => {
    it('should return only active signals from subscribed traders', async () => {
      const signals = await getActiveSignals(1);

      expect(signals).toHaveLength(2);
      signals.forEach(signal => {
        expect(signal.is_active).toBe(true);
        expect(signal.trader_id).toEqual(1);
        expect(typeof signal.entry_price).toBe('number');
      });
    });

    it('should not return inactive signals', async () => {
      // Mark one signal as inactive
      await db.update(signalsTable)
        .set({ is_active: false })
        .where(eq(signalsTable.symbol, 'BTC/USD'))
        .execute();

      const signals = await getActiveSignals(1);
      expect(signals).toHaveLength(1);
      expect(signals[0].symbol).toEqual('ETH/USD');
    });

    it('should not return expired signals', async () => {
      // Set expiration date in the past for one signal
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await db.update(signalsTable)
        .set({ expires_at: pastDate })
        .where(eq(signalsTable.symbol, 'BTC/USD'))
        .execute();

      const signals = await getActiveSignals(1);
      expect(signals).toHaveLength(1);
      expect(signals[0].symbol).toEqual('ETH/USD');
    });

    it('should include signals with future expiration dates', async () => {
      // Set expiration date in the future for all signals
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await db.update(signalsTable)
        .set({ expires_at: futureDate })
        .where(eq(signalsTable.trader_id, 1))
        .execute();

      const signals = await getActiveSignals(1);
      expect(signals).toHaveLength(2);
    });

    it('should include signals with null expiration dates', async () => {
      // Ensure signals with null expires_at are included
      const signals = await getActiveSignals(1);
      expect(signals).toHaveLength(2);
    });

    it('should return empty array for user with no active subscriptions', async () => {
      const signals = await getActiveSignals(2);
      expect(signals).toHaveLength(0);
    });
  });

  describe('getTraderSignals', () => {
    it('should return all signals from a specific trader', async () => {
      const signals = await getTraderSignals(1);

      expect(signals).toHaveLength(2);
      signals.forEach(signal => {
        expect(signal.trader_id).toEqual(1);
        expect(typeof signal.entry_price).toBe('number');
      });

      // Check specific signals
      const btcSignal = signals.find(s => s.symbol === 'BTC/USD');
      const ethSignal = signals.find(s => s.symbol === 'ETH/USD');

      expect(btcSignal).toBeDefined();
      expect(ethSignal).toBeDefined();
      expect(btcSignal!.signal_type).toEqual('buy');
      expect(ethSignal!.signal_type).toEqual('sell');
    });

    it('should return signals from different trader', async () => {
      const signals = await getTraderSignals(2);

      expect(signals).toHaveLength(1);
      expect(signals[0].symbol).toEqual('AAPL');
      expect(signals[0].asset_type).toEqual('stock');
      expect(signals[0].signal_type).toEqual('buy');
      expect(signals[0].entry_price).toEqual(150);
      expect(signals[0].stop_loss).toEqual(145);
      expect(signals[0].take_profit).toEqual(160);
      expect(typeof signals[0].entry_price).toBe('number');
    });

    it('should include both active and inactive signals', async () => {
      // Mark one signal as inactive
      await db.update(signalsTable)
        .set({ is_active: false })
        .where(eq(signalsTable.symbol, 'BTC/USD'))
        .execute();

      const signals = await getTraderSignals(1);
      expect(signals).toHaveLength(2);

      const inactiveSignal = signals.find(s => s.symbol === 'BTC/USD');
      const activeSignal = signals.find(s => s.symbol === 'ETH/USD');

      expect(inactiveSignal!.is_active).toBe(false);
      expect(activeSignal!.is_active).toBe(true);
    });

    it('should return empty array for trader with no signals', async () => {
      // Create a new trader without signals
      const newUser = await db.insert(usersTable).values({
        email: 'newuser@example.com',
        username: 'newuser',
        first_name: 'New',
        last_name: 'User',
        virtual_balance: '10000.00'
      }).returning().execute();

      const newTrader = await db.insert(tradersTable).values({
        user_id: newUser[0].id,
        display_name: 'New Trader',
        subscription_price: '50.00'
      }).returning().execute();

      const signals = await getTraderSignals(newTrader[0].id);
      expect(signals).toHaveLength(0);
    });

    it('should handle signals with null optional fields correctly', async () => {
      // Create signal with null optional fields
      await db.insert(signalsTable).values({
        trader_id: 1,
        symbol: 'MINIMAL',
        asset_type: 'crypto',
        signal_type: 'buy',
        entry_price: '100.00',
        stop_loss: null,
        take_profit: null,
        description: null,
        is_active: true,
        expires_at: null
      }).execute();

      const signals = await getTraderSignals(1);
      const minimalSignal = signals.find(s => s.symbol === 'MINIMAL');

      expect(minimalSignal).toBeDefined();
      expect(minimalSignal!.stop_loss).toBeNull();
      expect(minimalSignal!.take_profit).toBeNull();
      expect(minimalSignal!.description).toBeNull();
      expect(minimalSignal!.expires_at).toBeNull();
      expect(minimalSignal!.entry_price).toEqual(100);
      expect(typeof minimalSignal!.entry_price).toBe('number');
    });
  });
});