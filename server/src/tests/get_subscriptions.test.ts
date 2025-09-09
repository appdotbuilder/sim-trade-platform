import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradersTable, subscriptionsTable } from '../db/schema';
import { getUserSubscriptions, getActiveSubscriptions, cancelSubscription } from '../handlers/get_subscriptions';
import { eq } from 'drizzle-orm';

describe('getUserSubscriptions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all subscriptions for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create multiple subscriptions with different statuses
    await db.insert(subscriptionsTable)
      .values([
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'active',
          price_paid: '100.00'
        },
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'expired',
          price_paid: '100.00',
          end_date: new Date()
        },
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'cancelled',
          price_paid: '100.00',
          end_date: new Date()
        }
      ])
      .execute();

    const subscriptions = await getUserSubscriptions(userId);

    expect(subscriptions).toHaveLength(3);
    expect(subscriptions[0].subscriber_id).toEqual(userId);
    expect(subscriptions[0].trader_id).toEqual(traderId);
    expect(typeof subscriptions[0].price_paid).toBe('number');
    expect(subscriptions[0].price_paid).toEqual(100);

    // Check that we have all three different statuses
    const statuses = subscriptions.map(s => s.status).sort();
    expect(statuses).toEqual(['active', 'cancelled', 'expired']);
  });

  it('should return empty array when user has no subscriptions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'nosubscriber@test.com',
        username: 'nosubscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const subscriptions = await getUserSubscriptions(userId);

    expect(subscriptions).toHaveLength(0);
  });

  it('should only return subscriptions for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@test.com',
        username: 'user1',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@test.com',
        username: 'user2',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create subscriptions for both users
    await db.insert(subscriptionsTable)
      .values([
        {
          subscriber_id: user1Id,
          trader_id: traderId,
          status: 'active',
          price_paid: '100.00'
        },
        {
          subscriber_id: user2Id,
          trader_id: traderId,
          status: 'active',
          price_paid: '100.00'
        }
      ])
      .execute();

    const user1Subscriptions = await getUserSubscriptions(user1Id);
    const user2Subscriptions = await getUserSubscriptions(user2Id);

    expect(user1Subscriptions).toHaveLength(1);
    expect(user1Subscriptions[0].subscriber_id).toEqual(user1Id);

    expect(user2Subscriptions).toHaveLength(1);
    expect(user2Subscriptions[0].subscriber_id).toEqual(user2Id);
  });
});

describe('getActiveSubscriptions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only active subscriptions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create multiple subscriptions with different statuses
    await db.insert(subscriptionsTable)
      .values([
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'active',
          price_paid: '100.00'
        },
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'expired',
          price_paid: '100.00',
          end_date: new Date()
        },
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'cancelled',
          price_paid: '100.00',
          end_date: new Date()
        }
      ])
      .execute();

    const activeSubscriptions = await getActiveSubscriptions(userId);

    expect(activeSubscriptions).toHaveLength(1);
    expect(activeSubscriptions[0].status).toEqual('active');
    expect(activeSubscriptions[0].subscriber_id).toEqual(userId);
    expect(activeSubscriptions[0].trader_id).toEqual(traderId);
    expect(typeof activeSubscriptions[0].price_paid).toBe('number');
    expect(activeSubscriptions[0].price_paid).toEqual(100);
  });

  it('should return empty array when user has no active subscriptions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create only expired/cancelled subscriptions
    await db.insert(subscriptionsTable)
      .values([
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'expired',
          price_paid: '100.00',
          end_date: new Date()
        },
        {
          subscriber_id: userId,
          trader_id: traderId,
          status: 'cancelled',
          price_paid: '100.00',
          end_date: new Date()
        }
      ])
      .execute();

    const activeSubscriptions = await getActiveSubscriptions(userId);

    expect(activeSubscriptions).toHaveLength(0);
  });

  it('should return multiple active subscriptions if user has them', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create two traders
    const trader1UserResult = await db.insert(usersTable)
      .values({
        email: 'trader1@test.com',
        username: 'trader1',
        first_name: 'Trader',
        last_name: 'One'
      })
      .returning()
      .execute();
    const trader1UserId = trader1UserResult[0].id;

    const trader2UserResult = await db.insert(usersTable)
      .values({
        email: 'trader2@test.com',
        username: 'trader2',
        first_name: 'Trader',
        last_name: 'Two'
      })
      .returning()
      .execute();
    const trader2UserId = trader2UserResult[0].id;

    const trader1Result = await db.insert(tradersTable)
      .values({
        user_id: trader1UserId,
        display_name: 'Test Trader 1',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const trader1Id = trader1Result[0].id;

    const trader2Result = await db.insert(tradersTable)
      .values({
        user_id: trader2UserId,
        display_name: 'Test Trader 2',
        subscription_price: '150.00'
      })
      .returning()
      .execute();
    const trader2Id = trader2Result[0].id;

    // Create active subscriptions to both traders
    await db.insert(subscriptionsTable)
      .values([
        {
          subscriber_id: userId,
          trader_id: trader1Id,
          status: 'active',
          price_paid: '100.00'
        },
        {
          subscriber_id: userId,
          trader_id: trader2Id,
          status: 'active',
          price_paid: '150.00'
        }
      ])
      .execute();

    const activeSubscriptions = await getActiveSubscriptions(userId);

    expect(activeSubscriptions).toHaveLength(2);
    expect(activeSubscriptions.every(s => s.status === 'active')).toBe(true);
    expect(activeSubscriptions.every(s => s.subscriber_id === userId)).toBe(true);

    const traderIds = activeSubscriptions.map(s => s.trader_id).sort();
    expect(traderIds).toEqual([trader1Id, trader2Id].sort());
  });
});

describe('cancelSubscription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should cancel an active subscription', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create active subscription
    const subscriptionResult = await db.insert(subscriptionsTable)
      .values({
        subscriber_id: userId,
        trader_id: traderId,
        status: 'active',
        price_paid: '100.00'
      })
      .returning()
      .execute();
    const subscriptionId = subscriptionResult[0].id;

    const cancelledSubscription = await cancelSubscription(subscriptionId);

    expect(cancelledSubscription.id).toEqual(subscriptionId);
    expect(cancelledSubscription.status).toEqual('cancelled');
    expect(cancelledSubscription.end_date).toBeInstanceOf(Date);
    expect(typeof cancelledSubscription.price_paid).toBe('number');
    expect(cancelledSubscription.price_paid).toEqual(100);

    // Verify the subscription was actually updated in the database
    const dbSubscription = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, subscriptionId))
      .execute();

    expect(dbSubscription[0].status).toEqual('cancelled');
    expect(dbSubscription[0].end_date).toBeInstanceOf(Date);
  });

  it('should throw error when subscription does not exist', async () => {
    const nonExistentId = 99999;

    await expect(cancelSubscription(nonExistentId)).rejects.toThrow(/subscription not found/i);
  });

  it('should throw error when subscription is already cancelled', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create already cancelled subscription
    const subscriptionResult = await db.insert(subscriptionsTable)
      .values({
        subscriber_id: userId,
        trader_id: traderId,
        status: 'cancelled',
        price_paid: '100.00',
        end_date: new Date()
      })
      .returning()
      .execute();
    const subscriptionId = subscriptionResult[0].id;

    await expect(cancelSubscription(subscriptionId)).rejects.toThrow(/already cancelled/i);
  });

  it('should allow cancelling expired subscription', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'subscriber@test.com',
        username: 'subscriber',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test trader
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: 'trader@test.com',
        username: 'trader',
        first_name: 'Trader',
        last_name: 'User'
      })
      .returning()
      .execute();
    const traderUserId = traderUserResult[0].id;

    const traderResult = await db.insert(tradersTable)
      .values({
        user_id: traderUserId,
        display_name: 'Test Trader',
        subscription_price: '100.00'
      })
      .returning()
      .execute();
    const traderId = traderResult[0].id;

    // Create expired subscription
    const subscriptionResult = await db.insert(subscriptionsTable)
      .values({
        subscriber_id: userId,
        trader_id: traderId,
        status: 'expired',
        price_paid: '100.00',
        end_date: new Date()
      })
      .returning()
      .execute();
    const subscriptionId = subscriptionResult[0].id;

    const cancelledSubscription = await cancelSubscription(subscriptionId);

    expect(cancelledSubscription.status).toEqual('cancelled');
    expect(cancelledSubscription.end_date).toBeInstanceOf(Date);
  });
});