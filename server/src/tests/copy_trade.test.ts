import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradersTable, signalsTable, subscriptionsTable, copyTradesTable, tradesTable } from '../db/schema';
import { type CopyTradeInput } from '../schema';
import { copyTrade, getCopyTradeHistory } from '../handlers/copy_trade';
import { eq } from 'drizzle-orm';

describe('copyTrade', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully copy a trade from an active signal', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'trader@test.com',
          username: 'trader1',
          first_name: 'John',
          last_name: 'Trader'
        },
        {
          email: 'subscriber@test.com',
          username: 'subscriber1',
          first_name: 'Jane',
          last_name: 'Subscriber'
        }
      ])
      .returning()
      .execute();

    // Create trader profile
    const trader = await db.insert(tradersTable)
      .values({
        user_id: users[0].id,
        display_name: 'Expert Trader',
        subscription_price: '99.99'
      })
      .returning()
      .execute();

    // Create active subscription
    await db.insert(subscriptionsTable)
      .values({
        subscriber_id: users[1].id,
        trader_id: trader[0].id,
        status: 'active',
        price_paid: '99.99'
      })
      .execute();

    // Create active signal
    const signal = await db.insert(signalsTable)
      .values({
        trader_id: trader[0].id,
        symbol: 'BTCUSD',
        asset_type: 'crypto',
        signal_type: 'buy',
        entry_price: '50000.00000000',
        is_active: true
      })
      .returning()
      .execute();

    const input: CopyTradeInput = {
      subscriber_id: users[1].id,
      trader_id: trader[0].id,
      signal_id: signal[0].id
    };

    const result = await copyTrade(input);

    // Verify copy trade creation
    expect(result.subscriber_id).toEqual(users[1].id);
    expect(result.trader_id).toEqual(trader[0].id);
    expect(result.signal_id).toEqual(signal[0].id);
    expect(result.status).toEqual('executed');
    expect(result.copied_trade_id).toBeDefined();
    expect(result.executed_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify that a new trade was created
    const createdTrade = await db.select()
      .from(tradesTable)
      .where(eq(tradesTable.id, result.copied_trade_id!))
      .execute();

    expect(createdTrade).toHaveLength(1);
    expect(createdTrade[0].user_id).toEqual(users[1].id);
    expect(createdTrade[0].symbol).toEqual('BTCUSD');
    expect(createdTrade[0].asset_type).toEqual('crypto');
    expect(createdTrade[0].trade_type).toEqual('buy');
    expect(parseFloat(createdTrade[0].entry_price)).toEqual(50000);
    expect(createdTrade[0].status).toEqual('executed');
  });

  it('should fail when signal does not exist', async () => {
    const input: CopyTradeInput = {
      subscriber_id: 1,
      trader_id: 1,
      signal_id: 999
    };

    expect(copyTrade(input)).rejects.toThrow(/signal not found/i);
  });

  it('should fail when signal is not active', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'trader@test.com',
          username: 'trader1',
          first_name: 'John',
          last_name: 'Trader'
        },
        {
          email: 'subscriber@test.com',
          username: 'subscriber1',
          first_name: 'Jane',
          last_name: 'Subscriber'
        }
      ])
      .returning()
      .execute();

    // Create trader profile
    const trader = await db.insert(tradersTable)
      .values({
        user_id: users[0].id,
        display_name: 'Expert Trader',
        subscription_price: '99.99'
      })
      .returning()
      .execute();

    // Create inactive signal
    const signal = await db.insert(signalsTable)
      .values({
        trader_id: trader[0].id,
        symbol: 'BTCUSD',
        asset_type: 'crypto',
        signal_type: 'buy',
        entry_price: '50000.00000000',
        is_active: false
      })
      .returning()
      .execute();

    const input: CopyTradeInput = {
      subscriber_id: users[1].id,
      trader_id: trader[0].id,
      signal_id: signal[0].id
    };

    expect(copyTrade(input)).rejects.toThrow(/signal is no longer active/i);
  });

  it('should fail when trader_id does not match signal trader', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'trader1@test.com',
          username: 'trader1',
          first_name: 'John',
          last_name: 'Trader'
        },
        {
          email: 'trader2@test.com',
          username: 'trader2',
          first_name: 'Bob',
          last_name: 'Trader'
        },
        {
          email: 'subscriber@test.com',
          username: 'subscriber1',
          first_name: 'Jane',
          last_name: 'Subscriber'
        }
      ])
      .returning()
      .execute();

    // Create two traders
    const traders = await db.insert(tradersTable)
      .values([
        {
          user_id: users[0].id,
          display_name: 'Trader 1',
          subscription_price: '99.99'
        },
        {
          user_id: users[1].id,
          display_name: 'Trader 2',
          subscription_price: '149.99'
        }
      ])
      .returning()
      .execute();

    // Create signal for trader 1
    const signal = await db.insert(signalsTable)
      .values({
        trader_id: traders[0].id,
        symbol: 'BTCUSD',
        asset_type: 'crypto',
        signal_type: 'buy',
        entry_price: '50000.00000000',
        is_active: true
      })
      .returning()
      .execute();

    // Try to copy with wrong trader_id (trader 2)
    const input: CopyTradeInput = {
      subscriber_id: users[2].id,
      trader_id: traders[1].id, // Wrong trader ID
      signal_id: signal[0].id
    };

    expect(copyTrade(input)).rejects.toThrow(/trader id does not match signal trader/i);
  });

  it('should fail when no active subscription exists', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'trader@test.com',
          username: 'trader1',
          first_name: 'John',
          last_name: 'Trader'
        },
        {
          email: 'subscriber@test.com',
          username: 'subscriber1',
          first_name: 'Jane',
          last_name: 'Subscriber'
        }
      ])
      .returning()
      .execute();

    // Create trader profile
    const trader = await db.insert(tradersTable)
      .values({
        user_id: users[0].id,
        display_name: 'Expert Trader',
        subscription_price: '99.99'
      })
      .returning()
      .execute();

    // Create active signal but NO subscription
    const signal = await db.insert(signalsTable)
      .values({
        trader_id: trader[0].id,
        symbol: 'BTCUSD',
        asset_type: 'crypto',
        signal_type: 'buy',
        entry_price: '50000.00000000',
        is_active: true
      })
      .returning()
      .execute();

    const input: CopyTradeInput = {
      subscriber_id: users[1].id,
      trader_id: trader[0].id,
      signal_id: signal[0].id
    };

    expect(copyTrade(input)).rejects.toThrow(/no active subscription found/i);
  });

  it('should fail when subscriber user does not exist', async () => {
    // Create trader user only
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'trader@test.com',
          username: 'trader1',
          first_name: 'John',
          last_name: 'Trader'
        }
      ])
      .returning()
      .execute();

    // Create trader profile
    const trader = await db.insert(tradersTable)
      .values({
        user_id: users[0].id,
        display_name: 'Expert Trader',
        subscription_price: '99.99'
      })
      .returning()
      .execute();

    // Create active signal
    const signal = await db.insert(signalsTable)
      .values({
        trader_id: trader[0].id,
        symbol: 'BTCUSD',
        asset_type: 'crypto',
        signal_type: 'buy',
        entry_price: '50000.00000000',
        is_active: true
      })
      .returning()
      .execute();

    const input: CopyTradeInput = {
      subscriber_id: 999, // Non-existent user
      trader_id: trader[0].id,
      signal_id: signal[0].id
    };

    expect(copyTrade(input)).rejects.toThrow(/subscriber user not found/i);
  });
});

describe('getCopyTradeHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no copy trades', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        username: 'user1',
        first_name: 'John',
        last_name: 'User'
      })
      .returning()
      .execute();

    const result = await getCopyTradeHistory(user[0].id);
    expect(result).toHaveLength(0);
  });

  it('should return copy trade history for user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'trader@test.com',
          username: 'trader1',
          first_name: 'John',
          last_name: 'Trader'
        },
        {
          email: 'subscriber@test.com',
          username: 'subscriber1',
          first_name: 'Jane',
          last_name: 'Subscriber'
        }
      ])
      .returning()
      .execute();

    // Create trader profile
    const trader = await db.insert(tradersTable)
      .values({
        user_id: users[0].id,
        display_name: 'Expert Trader',
        subscription_price: '99.99'
      })
      .returning()
      .execute();

    // Create signals
    const signals = await db.insert(signalsTable)
      .values([
        {
          trader_id: trader[0].id,
          symbol: 'BTCUSD',
          asset_type: 'crypto',
          signal_type: 'buy',
          entry_price: '50000.00000000',
          is_active: true
        },
        {
          trader_id: trader[0].id,
          symbol: 'ETHUSD',
          asset_type: 'crypto',
          signal_type: 'sell',
          entry_price: '3000.00000000',
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create copy trades directly in database
    const copyTrades = await db.insert(copyTradesTable)
      .values([
        {
          subscriber_id: users[1].id,
          trader_id: trader[0].id,
          signal_id: signals[0].id,
          status: 'executed'
        },
        {
          subscriber_id: users[1].id,
          trader_id: trader[0].id,
          signal_id: signals[1].id,
          status: 'pending'
        }
      ])
      .returning()
      .execute();

    const result = await getCopyTradeHistory(users[1].id);

    expect(result).toHaveLength(2);
    expect(result[0].subscriber_id).toEqual(users[1].id);
    expect(result[0].trader_id).toEqual(trader[0].id);
    expect(result[0].signal_id).toEqual(signals[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].subscriber_id).toEqual(users[1].id);
    expect(result[1].trader_id).toEqual(trader[0].id);
    expect(result[1].signal_id).toEqual(signals[1].id);
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should fail when user does not exist', async () => {
    expect(getCopyTradeHistory(999)).rejects.toThrow(/user not found/i);
  });
});