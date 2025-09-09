import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tradersTable } from '../db/schema';
import { type CreateUserInput, type CreateTraderInput } from '../schema';
import { getAvailableTraders, getTraderById, getTopTraders } from '../handlers/get_traders';

// Test user data
const testUser: CreateUserInput = {
  email: 'trader@example.com',
  username: 'testtrader',
  first_name: 'John',
  last_name: 'Trader',
  phone: '+1234567890',
  country: 'US'
};

const testTrader: CreateTraderInput = {
  user_id: 1,
  display_name: 'Pro Trader',
  bio: 'Professional crypto trader with 5 years experience',
  subscription_price: 99.99
};

describe('getAvailableTraders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active traders ordered by followers', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      phone: testUser.phone,
      country: testUser.country
    }).execute();

    // Create multiple traders with different follower counts
    await db.insert(tradersTable).values([
      {
        user_id: 1,
        display_name: 'Trader A',
        subscription_price: '50.00',
        total_followers: 100,
        profit_percentage: '15.50',
        win_rate: '65.00',
        is_active: true
      },
      {
        user_id: 1,
        display_name: 'Trader B',
        subscription_price: '75.00',
        total_followers: 200,
        profit_percentage: '20.25',
        win_rate: '70.50',
        is_active: true
      },
      {
        user_id: 1,
        display_name: 'Inactive Trader',
        subscription_price: '100.00',
        total_followers: 300,
        profit_percentage: '25.00',
        win_rate: '80.00',
        is_active: false
      }
    ]).execute();

    const result = await getAvailableTraders();

    expect(result).toHaveLength(2); // Only active traders
    expect(result[0].display_name).toEqual('Trader B'); // Higher followers first
    expect(result[1].display_name).toEqual('Trader A');
    
    // Verify numeric conversions
    expect(typeof result[0].profit_percentage).toBe('number');
    expect(typeof result[0].win_rate).toBe('number');
    expect(typeof result[0].subscription_price).toBe('number');
    
    expect(result[0].profit_percentage).toEqual(20.25);
    expect(result[0].win_rate).toEqual(70.5);
    expect(result[0].subscription_price).toEqual(75.0);
  });

  it('should return empty array when no active traders exist', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create only inactive trader
    await db.insert(tradersTable).values({
      user_id: 1,
      display_name: 'Inactive Trader',
      subscription_price: '100.00',
      is_active: false
    }).execute();

    const result = await getAvailableTraders();

    expect(result).toHaveLength(0);
  });
});

describe('getTraderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return trader by ID with correct numeric conversions', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create trader
    const traderResult = await db.insert(tradersTable).values({
      user_id: 1,
      display_name: testTrader.display_name,
      bio: testTrader.bio,
      subscription_price: testTrader.subscription_price.toString(),
      profit_percentage: '12.75',
      win_rate: '68.50',
      total_followers: 150,
      total_trades: 50
    }).returning().execute();

    const traderId = traderResult[0].id;
    const result = await getTraderById(traderId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(traderId);
    expect(result!.display_name).toEqual('Pro Trader');
    expect(result!.bio).toEqual('Professional crypto trader with 5 years experience');
    
    // Verify numeric conversions
    expect(typeof result!.profit_percentage).toBe('number');
    expect(typeof result!.win_rate).toBe('number');
    expect(typeof result!.subscription_price).toBe('number');
    
    expect(result!.profit_percentage).toEqual(12.75);
    expect(result!.win_rate).toEqual(68.5);
    expect(result!.subscription_price).toEqual(99.99);
    expect(result!.total_followers).toEqual(150);
    expect(result!.total_trades).toEqual(50);
  });

  it('should return null when trader not found', async () => {
    const result = await getTraderById(999);

    expect(result).toBeNull();
  });

  it('should return inactive trader if requested by ID', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create inactive trader
    const traderResult = await db.insert(tradersTable).values({
      user_id: 1,
      display_name: 'Inactive Trader',
      subscription_price: '50.00',
      is_active: false
    }).returning().execute();

    const traderId = traderResult[0].id;
    const result = await getTraderById(traderId);

    expect(result).not.toBeNull();
    expect(result!.display_name).toEqual('Inactive Trader');
    expect(result!.is_active).toBe(false);
  });
});

describe('getTopTraders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return top traders ordered by profit percentage, win rate, and followers', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create traders with different performance metrics
    await db.insert(tradersTable).values([
      {
        user_id: 1,
        display_name: 'Best Trader',
        subscription_price: '100.00',
        profit_percentage: '25.00', // Highest profit
        win_rate: '80.00',
        total_followers: 500,
        is_active: true
      },
      {
        user_id: 1,
        display_name: 'Good Trader',
        subscription_price: '75.00',
        profit_percentage: '20.00',
        win_rate: '85.00', // Higher win rate but lower profit
        total_followers: 400,
        is_active: true
      },
      {
        user_id: 1,
        display_name: 'Average Trader',
        subscription_price: '50.00',
        profit_percentage: '15.00',
        win_rate: '70.00',
        total_followers: 300,
        is_active: true
      },
      {
        user_id: 1,
        display_name: 'Inactive Top Trader',
        subscription_price: '200.00',
        profit_percentage: '30.00', // Would be best but inactive
        win_rate: '90.00',
        total_followers: 1000,
        is_active: false
      }
    ]).execute();

    const result = await getTopTraders(3);

    expect(result).toHaveLength(3); // Only active traders, limited to 3
    
    // Should be ordered by profit_percentage first
    expect(result[0].display_name).toEqual('Best Trader');
    expect(result[1].display_name).toEqual('Good Trader');
    expect(result[2].display_name).toEqual('Average Trader');
    
    // Verify numeric conversions
    expect(result[0].profit_percentage).toEqual(25.0);
    expect(result[0].win_rate).toEqual(80.0);
    expect(result[0].subscription_price).toEqual(100.0);
  });

  it('should respect the limit parameter', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create 5 traders
    const traders = [];
    for (let i = 1; i <= 5; i++) {
      traders.push({
        user_id: 1,
        display_name: `Trader ${i}`,
        subscription_price: '50.00',
        profit_percentage: (10 + i).toString(),
        win_rate: '70.00',
        total_followers: 100,
        is_active: true
      });
    }

    await db.insert(tradersTable).values(traders).execute();

    const result = await getTopTraders(2);

    expect(result).toHaveLength(2);
    expect(result[0].display_name).toEqual('Trader 5'); // Highest profit (15%)
    expect(result[1].display_name).toEqual('Trader 4'); // Second highest (14%)
  });

  it('should use default limit of 10 when not specified', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create 15 traders
    const traders = [];
    for (let i = 1; i <= 15; i++) {
      traders.push({
        user_id: 1,
        display_name: `Trader ${i}`,
        subscription_price: '50.00',
        profit_percentage: i.toString(),
        win_rate: '70.00',
        total_followers: 100,
        is_active: true
      });
    }

    await db.insert(tradersTable).values(traders).execute();

    const result = await getTopTraders(); // No limit specified

    expect(result).toHaveLength(10); // Default limit
    expect(result[0].display_name).toEqual('Trader 15'); // Highest profit
    expect(result[9].display_name).toEqual('Trader 6'); // 10th highest
  });

  it('should return empty array when no active traders exist', async () => {
    const result = await getTopTraders();

    expect(result).toHaveLength(0);
  });
});