import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradersTable } from '../db/schema';
import { type CreateTraderInput, type CreateUserInput } from '../schema';
import { createTrader } from '../handlers/create_trader';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'trader@example.com',
  username: 'testtrader',
  first_name: 'Test',
  last_name: 'Trader',
  phone: '+1234567890',
  country: 'US'
};

const testTraderInput: CreateTraderInput = {
  user_id: 1, // Will be set after user creation
  display_name: 'Pro Trader',
  bio: 'Experienced crypto trader with 5+ years',
  subscription_price: 99.99
};

describe('createTrader', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a trader profile', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
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

    const userId = userResult[0].id;
    const traderInput = { ...testTraderInput, user_id: userId };

    const result = await createTrader(traderInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.display_name).toEqual('Pro Trader');
    expect(result.bio).toEqual('Experienced crypto trader with 5+ years');
    expect(result.subscription_price).toEqual(99.99);
    expect(typeof result.subscription_price).toEqual('number');
    
    // Default values
    expect(result.total_followers).toEqual(0);
    expect(result.profit_percentage).toEqual(0);
    expect(result.win_rate).toEqual(0);
    expect(result.total_trades).toEqual(0);
    expect(result.is_active).toEqual(true);
    
    // Auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save trader to database', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
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

    const userId = userResult[0].id;
    const traderInput = { ...testTraderInput, user_id: userId };

    const result = await createTrader(traderInput);

    // Query using proper drizzle syntax
    const traders = await db.select()
      .from(tradersTable)
      .where(eq(tradersTable.id, result.id))
      .execute();

    expect(traders).toHaveLength(1);
    expect(traders[0].user_id).toEqual(userId);
    expect(traders[0].display_name).toEqual('Pro Trader');
    expect(traders[0].bio).toEqual('Experienced crypto trader with 5+ years');
    expect(parseFloat(traders[0].subscription_price)).toEqual(99.99);
    expect(traders[0].is_active).toEqual(true);
    expect(traders[0].created_at).toBeInstanceOf(Date);
  });

  it('should create trader with optional bio as null', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const traderInput: CreateTraderInput = {
      user_id: userId,
      display_name: 'Minimal Trader',
      subscription_price: 49.99
    };

    const result = await createTrader(traderInput);

    expect(result.bio).toBeNull();
    expect(result.display_name).toEqual('Minimal Trader');
    expect(result.subscription_price).toEqual(49.99);
  });

  it('should handle zero subscription price', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const traderInput: CreateTraderInput = {
      user_id: userId,
      display_name: 'Free Trader',
      bio: 'Sharing signals for free',
      subscription_price: 0
    };

    const result = await createTrader(traderInput);

    expect(result.subscription_price).toEqual(0);
    expect(typeof result.subscription_price).toEqual('number');
  });

  it('should throw error if user does not exist', async () => {
    const traderInput: CreateTraderInput = {
      user_id: 999, // Non-existent user
      display_name: 'Invalid Trader',
      subscription_price: 50
    };

    expect(createTrader(traderInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should throw error if user already has trader profile', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const traderInput = { ...testTraderInput, user_id: userId };

    // Create first trader profile
    await createTrader(traderInput);

    // Try to create second trader profile for same user
    const duplicateTraderInput: CreateTraderInput = {
      user_id: userId,
      display_name: 'Duplicate Trader',
      subscription_price: 75
    };

    expect(createTrader(duplicateTraderInput)).rejects.toThrow(/already has a trader profile/i);
  });

  it('should verify numeric type conversions are correct', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const traderInput: CreateTraderInput = {
      user_id: userId,
      display_name: 'Number Test Trader',
      subscription_price: 123.45
    };

    const result = await createTrader(traderInput);

    // Verify all numeric fields return as numbers, not strings
    expect(typeof result.subscription_price).toEqual('number');
    expect(typeof result.profit_percentage).toEqual('number');
    expect(typeof result.win_rate).toEqual('number');
    expect(result.subscription_price).toEqual(123.45);
    expect(result.profit_percentage).toEqual(0);
    expect(result.win_rate).toEqual(0);
  });
});