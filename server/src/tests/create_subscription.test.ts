import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradersTable, subscriptionsTable } from '../db/schema';
import { type CreateSubscriptionInput, type CreateUserInput, type CreateTraderInput } from '../schema';
import { createSubscription } from '../handlers/create_subscription';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'subscriber@test.com',
  username: 'testsubscriber',
  first_name: 'Test',
  last_name: 'User'
};

const testTraderUser: CreateUserInput = {
  email: 'trader@test.com',
  username: 'testtrader',
  first_name: 'Trader',
  last_name: 'User'
};

const testTraderProfile: CreateTraderInput = {
  user_id: 2,
  display_name: 'Pro Trader',
  subscription_price: 100
};

// Test subscription input
const testInput: CreateSubscriptionInput = {
  subscriber_id: 1,
  trader_id: 1,
  price_paid: 100
};

describe('createSubscription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a subscription successfully', async () => {
    // Create prerequisite users
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        virtual_balance: '1000.00' // Sufficient balance
      })
      .returning()
      .execute();

    const traderUserResult = await db.insert(usersTable)
      .values({
        email: testTraderUser.email,
        username: testTraderUser.username,
        first_name: testTraderUser.first_name,
        last_name: testTraderUser.last_name
      })
      .returning()
      .execute();

    // Create trader profile
    await db.insert(tradersTable)
      .values({
        user_id: traderUserResult[0].id,
        display_name: testTraderProfile.display_name,
        subscription_price: testTraderProfile.subscription_price.toString()
      })
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: userResult[0].id,
      trader_id: 1,
      price_paid: 100
    };

    const result = await createSubscription(subscriptionInput);

    // Basic field validation
    expect(result.subscriber_id).toEqual(userResult[0].id);
    expect(result.trader_id).toEqual(1);
    expect(result.price_paid).toEqual(100);
    expect(typeof result.price_paid).toEqual('number');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.end_date).toBeNull();
  });

  it('should save subscription to database and deduct balance', async () => {
    // Create prerequisite users with specific balance
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        virtual_balance: '500.00'
      })
      .returning()
      .execute();

    const traderUserResult = await db.insert(usersTable)
      .values({
        email: testTraderUser.email,
        username: testTraderUser.username,
        first_name: testTraderUser.first_name,
        last_name: testTraderUser.last_name
      })
      .returning()
      .execute();

    // Create trader profile
    await db.insert(tradersTable)
      .values({
        user_id: traderUserResult[0].id,
        display_name: testTraderProfile.display_name,
        subscription_price: '150.00'
      })
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: userResult[0].id,
      trader_id: 1,
      price_paid: 150
    };

    const result = await createSubscription(subscriptionInput);

    // Verify subscription was saved to database
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, result.id))
      .execute();

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].subscriber_id).toEqual(userResult[0].id);
    expect(subscriptions[0].trader_id).toEqual(1);
    expect(parseFloat(subscriptions[0].price_paid)).toEqual(150);
    expect(subscriptions[0].status).toEqual('active');

    // Verify balance was deducted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userResult[0].id))
      .execute();

    expect(parseFloat(users[0].virtual_balance)).toEqual(350); // 500 - 150
  });

  it('should throw error when subscriber not found', async () => {
    // Create only trader user
    const traderUserResult = await db.insert(usersTable)
      .values({
        email: testTraderUser.email,
        username: testTraderUser.username,
        first_name: testTraderUser.first_name,
        last_name: testTraderUser.last_name
      })
      .returning()
      .execute();

    await db.insert(tradersTable)
      .values({
        user_id: traderUserResult[0].id,
        display_name: testTraderProfile.display_name,
        subscription_price: testTraderProfile.subscription_price.toString()
      })
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: 999, // Non-existent user
      trader_id: 1,
      price_paid: 100
    };

    await expect(createSubscription(subscriptionInput)).rejects.toThrow(/subscriber not found/i);
  });

  it('should throw error when trader not found', async () => {
    // Create only subscriber user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        virtual_balance: '1000.00'
      })
      .returning()
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: userResult[0].id,
      trader_id: 999, // Non-existent trader
      price_paid: 100
    };

    await expect(createSubscription(subscriptionInput)).rejects.toThrow(/trader not found/i);
  });

  it('should throw error when subscriber has insufficient balance', async () => {
    // Create users
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        virtual_balance: '50.00' // Insufficient balance
      })
      .returning()
      .execute();

    const traderUserResult = await db.insert(usersTable)
      .values({
        email: testTraderUser.email,
        username: testTraderUser.username,
        first_name: testTraderUser.first_name,
        last_name: testTraderUser.last_name
      })
      .returning()
      .execute();

    await db.insert(tradersTable)
      .values({
        user_id: traderUserResult[0].id,
        display_name: testTraderProfile.display_name,
        subscription_price: testTraderProfile.subscription_price.toString()
      })
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: userResult[0].id,
      trader_id: 1,
      price_paid: 100
    };

    await expect(createSubscription(subscriptionInput)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error when price paid is less than trader subscription price', async () => {
    // Create users
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        virtual_balance: '1000.00'
      })
      .returning()
      .execute();

    const traderUserResult = await db.insert(usersTable)
      .values({
        email: testTraderUser.email,
        username: testTraderUser.username,
        first_name: testTraderUser.first_name,
        last_name: testTraderUser.last_name
      })
      .returning()
      .execute();

    await db.insert(tradersTable)
      .values({
        user_id: traderUserResult[0].id,
        display_name: testTraderProfile.display_name,
        subscription_price: '200.00' // Higher than price paid
      })
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: userResult[0].id,
      trader_id: 1,
      price_paid: 100 // Less than trader's price
    };

    await expect(createSubscription(subscriptionInput)).rejects.toThrow(/price paid is less than trader subscription price/i);
  });

  it('should handle exact subscription price match', async () => {
    // Create users
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        virtual_balance: '250.00'
      })
      .returning()
      .execute();

    const traderUserResult = await db.insert(usersTable)
      .values({
        email: testTraderUser.email,
        username: testTraderUser.username,
        first_name: testTraderUser.first_name,
        last_name: testTraderUser.last_name
      })
      .returning()
      .execute();

    await db.insert(tradersTable)
      .values({
        user_id: traderUserResult[0].id,
        display_name: testTraderProfile.display_name,
        subscription_price: '75.50'
      })
      .execute();

    const subscriptionInput: CreateSubscriptionInput = {
      subscriber_id: userResult[0].id,
      trader_id: 1,
      price_paid: 75.50 // Exact match
    };

    const result = await createSubscription(subscriptionInput);

    expect(result.price_paid).toEqual(75.50);
    expect(typeof result.price_paid).toEqual('number');

    // Verify balance was deducted correctly
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userResult[0].id))
      .execute();

    expect(parseFloat(users[0].virtual_balance)).toEqual(174.50); // 250 - 75.50
  });
});