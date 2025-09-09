import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser123',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  country: 'US'
};

// Test input with minimal required fields
const minimalInput: CreateUserInput = {
  email: 'minimal@example.com',
  username: 'minimaluser',
  first_name: 'Jane',
  last_name: 'Smith'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser123');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.country).toEqual('US');
    expect(result.is_verified).toEqual(false);
    expect(result.avatar_url).toBeNull();
    expect(result.virtual_balance).toEqual(10000.00);
    expect(typeof result.virtual_balance).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal fields', async () => {
    const result = await createUser(minimalInput);

    // Basic field validation
    expect(result.email).toEqual('minimal@example.com');
    expect(result.username).toEqual('minimaluser');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.phone).toBeNull();
    expect(result.country).toBeNull();
    expect(result.is_verified).toEqual(false);
    expect(result.avatar_url).toBeNull();
    expect(result.virtual_balance).toEqual(10000.00);
    expect(typeof result.virtual_balance).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testuser123');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].country).toEqual('US');
    expect(users[0].is_verified).toEqual(false);
    expect(users[0].avatar_url).toBeNull();
    expect(parseFloat(users[0].virtual_balance)).toEqual(10000.00);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create default virtual wallet for user', async () => {
    const result = await createUser(testInput);

    // Query wallet from database
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, result.id))
      .execute();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].user_id).toEqual(result.id);
    expect(wallets[0].currency).toEqual('USD');
    expect(parseFloat(wallets[0].balance)).toEqual(10000.00);
    expect(parseFloat(wallets[0].available_balance)).toEqual(10000.00);
    expect(parseFloat(wallets[0].locked_balance)).toEqual(0.00);
    expect(wallets[0].created_at).toBeInstanceOf(Date);
    expect(wallets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate email error', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle duplicate username error', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle null optional fields correctly', async () => {
    const inputWithNulls: CreateUserInput = {
      email: 'nulltest@example.com',
      username: 'nulltestuser',
      first_name: 'Null',
      last_name: 'Test',
      phone: null,
      country: null
    };

    const result = await createUser(inputWithNulls);

    expect(result.phone).toBeNull();
    expect(result.country).toBeNull();

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].phone).toBeNull();
    expect(users[0].country).toBeNull();
  });

  it('should create multiple users with different data', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser(minimalInput);

    // Verify both users exist and have different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('minimal@example.com');

    // Verify both have wallets
    const user1Wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, user1.id))
      .execute();

    const user2Wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, user2.id))
      .execute();

    expect(user1Wallets).toHaveLength(1);
    expect(user2Wallets).toHaveLength(1);
  });
});