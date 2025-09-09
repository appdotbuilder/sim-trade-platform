import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUser, getUserByEmail } from '../handlers/get_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  phone: '+1234567890',
  country: 'US'
};

const anotherTestUser = {
  email: 'another@example.com',
  username: 'anotheruser',
  first_name: 'Another',
  last_name: 'User',
  phone: null,
  country: null
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found by ID', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Test getUser function
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.username).toEqual('testuser');
    expect(result!.first_name).toEqual('Test');
    expect(result!.last_name).toEqual('User');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.country).toEqual('US');
    expect(result!.is_verified).toEqual(false);
    expect(result!.avatar_url).toBeNull();
    expect(typeof result!.virtual_balance).toEqual('number');
    expect(result!.virtual_balance).toEqual(10000.00);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found by ID', async () => {
    const result = await getUser(999999);
    expect(result).toBeNull();
  });

  it('should handle users with null phone and country', async () => {
    // Create user with null fields
    const insertResult = await db.insert(usersTable)
      .values(anotherTestUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.country).toBeNull();
    expect(result!.email).toEqual('another@example.com');
  });

  it('should return correct numeric conversion for virtual_balance', async () => {
    // Create user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(typeof result!.virtual_balance).toEqual('number');
    expect(result!.virtual_balance).toEqual(10000.00);
    expect(Number.isFinite(result!.virtual_balance)).toBe(true);
  });
});

describe('getUserByEmail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found by email', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Test getUserByEmail function
    const result = await getUserByEmail('test@example.com');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.username).toEqual('testuser');
    expect(result!.first_name).toEqual('Test');
    expect(result!.last_name).toEqual('User');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.country).toEqual('US');
    expect(result!.is_verified).toEqual(false);
    expect(result!.avatar_url).toBeNull();
    expect(typeof result!.virtual_balance).toEqual('number');
    expect(result!.virtual_balance).toEqual(10000.00);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found by email', async () => {
    const result = await getUserByEmail('nonexistent@example.com');
    expect(result).toBeNull();
  });

  it('should be case sensitive for email lookup', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Test with different case
    const result = await getUserByEmail('TEST@EXAMPLE.COM');
    expect(result).toBeNull();
  });

  it('should handle users with null optional fields', async () => {
    // Create user with null fields
    const insertResult = await db.insert(usersTable)
      .values(anotherTestUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const result = await getUserByEmail('another@example.com');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.phone).toBeNull();
    expect(result!.country).toBeNull();
    expect(result!.email).toEqual('another@example.com');
  });

  it('should return correct numeric conversion for virtual_balance', async () => {
    // Create user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const result = await getUserByEmail('test@example.com');

    expect(result).not.toBeNull();
    expect(typeof result!.virtual_balance).toEqual('number');
    expect(result!.virtual_balance).toEqual(10000.00);
    expect(Number.isFinite(result!.virtual_balance)).toBe(true);
  });
});

describe('getUser and getUserByEmail integration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return same user data when querying by ID and email', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user by both methods
    const userById = await getUser(createdUser.id);
    const userByEmail = await getUserByEmail('test@example.com');

    expect(userById).not.toBeNull();
    expect(userByEmail).not.toBeNull();

    // Compare all fields
    expect(userById!.id).toEqual(userByEmail!.id);
    expect(userById!.email).toEqual(userByEmail!.email);
    expect(userById!.username).toEqual(userByEmail!.username);
    expect(userById!.first_name).toEqual(userByEmail!.first_name);
    expect(userById!.last_name).toEqual(userByEmail!.last_name);
    expect(userById!.phone).toEqual(userByEmail!.phone);
    expect(userById!.country).toEqual(userByEmail!.country);
    expect(userById!.is_verified).toEqual(userByEmail!.is_verified);
    expect(userById!.avatar_url).toEqual(userByEmail!.avatar_url);
    expect(userById!.virtual_balance).toEqual(userByEmail!.virtual_balance);
    expect(userById!.created_at.getTime()).toEqual(userByEmail!.created_at.getTime());
    expect(userById!.updated_at.getTime()).toEqual(userByEmail!.updated_at.getTime());
  });

  it('should handle multiple users correctly', async () => {
    // Create multiple test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values(anotherTestUser)
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Test getting correct users
    const fetchedUser1 = await getUser(user1.id);
    const fetchedUser2 = await getUserByEmail('another@example.com');

    expect(fetchedUser1!.email).toEqual('test@example.com');
    expect(fetchedUser2!.email).toEqual('another@example.com');
    expect(fetchedUser1!.id).not.toEqual(fetchedUser2!.id);
  });
});