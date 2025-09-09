import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserWallets, getWalletByCurrency } from '../handlers/get_wallets';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'testuser@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  phone: '+1234567890',
  country: 'US'
};

describe('getUserWallets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no wallets', async () => {
    // Create user
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

    const wallets = await getUserWallets(userId);

    expect(wallets).toEqual([]);
  });

  it('should return single wallet for user', async () => {
    // Create user
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

    // Create wallet
    await db.insert(walletsTable)
      .values({
        user_id: userId,
        currency: 'USD',
        balance: '1000.50000000',
        available_balance: '800.25000000',
        locked_balance: '200.25000000'
      })
      .execute();

    const wallets = await getUserWallets(userId);

    expect(wallets).toHaveLength(1);
    expect(wallets[0].user_id).toEqual(userId);
    expect(wallets[0].currency).toEqual('USD');
    expect(wallets[0].balance).toEqual(1000.5);
    expect(wallets[0].available_balance).toEqual(800.25);
    expect(wallets[0].locked_balance).toEqual(200.25);
    expect(wallets[0].created_at).toBeInstanceOf(Date);
    expect(wallets[0].updated_at).toBeInstanceOf(Date);
    expect(wallets[0].id).toBeDefined();

    // Verify numeric type conversions
    expect(typeof wallets[0].balance).toBe('number');
    expect(typeof wallets[0].available_balance).toBe('number');
    expect(typeof wallets[0].locked_balance).toBe('number');
  });

  it('should return multiple wallets for user', async () => {
    // Create user
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

    // Create multiple wallets
    await db.insert(walletsTable)
      .values([
        {
          user_id: userId,
          currency: 'USD',
          balance: '1000.00000000',
          available_balance: '800.00000000',
          locked_balance: '200.00000000'
        },
        {
          user_id: userId,
          currency: 'BTC',
          balance: '0.50000000',
          available_balance: '0.30000000',
          locked_balance: '0.20000000'
        },
        {
          user_id: userId,
          currency: 'ETH',
          balance: '5.75000000',
          available_balance: '4.25000000',
          locked_balance: '1.50000000'
        }
      ])
      .execute();

    const wallets = await getUserWallets(userId);

    expect(wallets).toHaveLength(3);

    // Verify all wallets belong to the user
    wallets.forEach(wallet => {
      expect(wallet.user_id).toEqual(userId);
      expect(typeof wallet.balance).toBe('number');
      expect(typeof wallet.available_balance).toBe('number');
      expect(typeof wallet.locked_balance).toBe('number');
    });

    // Check specific currencies exist
    const currencies = wallets.map(w => w.currency);
    expect(currencies).toContain('USD');
    expect(currencies).toContain('BTC');
    expect(currencies).toContain('ETH');
  });

  it('should only return wallets for specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        first_name: 'User',
        last_name: 'One',
        phone: '+1111111111',
        country: 'US'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        first_name: 'User',
        last_name: 'Two',
        phone: '+2222222222',
        country: 'CA'
      })
      .returning()
      .execute();

    const userId1 = user1Result[0].id;
    const userId2 = user2Result[0].id;

    // Create wallets for both users
    await db.insert(walletsTable)
      .values([
        {
          user_id: userId1,
          currency: 'USD',
          balance: '1000.00000000',
          available_balance: '1000.00000000',
          locked_balance: '0.00000000'
        },
        {
          user_id: userId2,
          currency: 'USD',
          balance: '2000.00000000',
          available_balance: '2000.00000000',
          locked_balance: '0.00000000'
        },
        {
          user_id: userId2,
          currency: 'BTC',
          balance: '1.00000000',
          available_balance: '1.00000000',
          locked_balance: '0.00000000'
        }
      ])
      .execute();

    // Get wallets for user1
    const user1Wallets = await getUserWallets(userId1);
    expect(user1Wallets).toHaveLength(1);
    expect(user1Wallets[0].user_id).toEqual(userId1);
    expect(user1Wallets[0].currency).toEqual('USD');

    // Get wallets for user2
    const user2Wallets = await getUserWallets(userId2);
    expect(user2Wallets).toHaveLength(2);
    user2Wallets.forEach(wallet => {
      expect(wallet.user_id).toEqual(userId2);
    });
  });
});

describe('getWalletByCurrency', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when user has no wallet for currency', async () => {
    // Create user
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

    const wallet = await getWalletByCurrency(userId, 'USD');

    expect(wallet).toBeNull();
  });

  it('should return wallet when user has wallet for currency', async () => {
    // Create user
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

    // Create wallet
    const walletResult = await db.insert(walletsTable)
      .values({
        user_id: userId,
        currency: 'USD',
        balance: '1500.75000000',
        available_balance: '1200.50000000',
        locked_balance: '300.25000000'
      })
      .returning()
      .execute();

    const wallet = await getWalletByCurrency(userId, 'USD');

    expect(wallet).not.toBeNull();
    expect(wallet!.id).toEqual(walletResult[0].id);
    expect(wallet!.user_id).toEqual(userId);
    expect(wallet!.currency).toEqual('USD');
    expect(wallet!.balance).toEqual(1500.75);
    expect(wallet!.available_balance).toEqual(1200.5);
    expect(wallet!.locked_balance).toEqual(300.25);
    expect(wallet!.created_at).toBeInstanceOf(Date);
    expect(wallet!.updated_at).toBeInstanceOf(Date);

    // Verify numeric type conversions
    expect(typeof wallet!.balance).toBe('number');
    expect(typeof wallet!.available_balance).toBe('number');
    expect(typeof wallet!.locked_balance).toBe('number');
  });

  it('should return null when user has different currency wallet', async () => {
    // Create user
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

    // Create BTC wallet
    await db.insert(walletsTable)
      .values({
        user_id: userId,
        currency: 'BTC',
        balance: '1.00000000',
        available_balance: '1.00000000',
        locked_balance: '0.00000000'
      })
      .execute();

    // Try to get USD wallet
    const wallet = await getWalletByCurrency(userId, 'USD');

    expect(wallet).toBeNull();
  });

  it('should return null when different user has wallet for currency', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        first_name: 'User',
        last_name: 'One',
        phone: '+1111111111',
        country: 'US'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        first_name: 'User',
        last_name: 'Two',
        phone: '+2222222222',
        country: 'CA'
      })
      .returning()
      .execute();

    const userId1 = user1Result[0].id;
    const userId2 = user2Result[0].id;

    // Create wallet for user2
    await db.insert(walletsTable)
      .values({
        user_id: userId2,
        currency: 'USD',
        balance: '1000.00000000',
        available_balance: '1000.00000000',
        locked_balance: '0.00000000'
      })
      .execute();

    // Try to get USD wallet for user1
    const wallet = await getWalletByCurrency(userId1, 'USD');

    expect(wallet).toBeNull();
  });

  it('should handle case sensitive currency matching', async () => {
    // Create user
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

    // Create USD wallet
    await db.insert(walletsTable)
      .values({
        user_id: userId,
        currency: 'USD',
        balance: '1000.00000000',
        available_balance: '1000.00000000',
        locked_balance: '0.00000000'
      })
      .execute();

    // Search with exact match should work
    const exactMatch = await getWalletByCurrency(userId, 'USD');
    expect(exactMatch).not.toBeNull();
    expect(exactMatch!.currency).toEqual('USD');

    // Search with different case should not match
    const lowerCase = await getWalletByCurrency(userId, 'usd');
    expect(lowerCase).toBeNull();
  });
});