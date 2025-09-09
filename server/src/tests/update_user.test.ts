import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser, verifyUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper to create a test user
const createTestUser = async (userData: CreateUserInput) => {
  const result = await db.insert(usersTable)
    .values({
      email: userData.email,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone || null,
      country: userData.country || null
    })
    .returning()
    .execute();
  
  return result[0];
};

const testUserData: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  country: 'US'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user profile with all fields', async () => {
    // Create test user
    const testUser = await createTestUser(testUserData);

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      first_name: 'Jane',
      last_name: 'Smith',
      phone: '+0987654321',
      country: 'CA',
      avatar_url: 'https://example.com/avatar.jpg'
    };

    const result = await updateUser(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(testUser.id);
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.phone).toEqual('+0987654321');
    expect(result.country).toEqual('CA');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.email).toEqual(testUser.email); // Should remain unchanged
    expect(result.username).toEqual(testUser.username); // Should remain unchanged
    expect(typeof result.virtual_balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    const testUser = await createTestUser(testUserData);

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      first_name: 'Jane'
    };

    const result = await updateUser(updateInput);

    // Only first_name should be updated
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual(testUser.last_name); // Should remain unchanged
    expect(result.phone).toEqual(testUser.phone); // Should remain unchanged
    expect(result.country).toEqual(testUser.country); // Should remain unchanged
    expect(result.avatar_url).toBeNull(); // Should remain unchanged
  });

  it('should save updates to database', async () => {
    const testUser = await createTestUser(testUserData);

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      first_name: 'Updated Name',
      country: 'UK'
    };

    await updateUser(updateInput);

    // Verify changes in database
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].first_name).toEqual('Updated Name');
    expect(updatedUsers[0].country).toEqual('UK');
    expect(updatedUsers[0].last_name).toEqual(testUser.last_name); // Unchanged
  });

  it('should handle null values correctly', async () => {
    const testUser = await createTestUser(testUserData);

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      phone: null,
      country: null,
      avatar_url: null
    };

    const result = await updateUser(updateInput);

    expect(result.phone).toBeNull();
    expect(result.country).toBeNull();
    expect(result.avatar_url).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999,
      first_name: 'Test'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });
});

describe('verifyUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should verify user successfully', async () => {
    // Create test user (unverified by default)
    const testUser = await createTestUser(testUserData);
    expect(testUser.is_verified).toBe(false);

    const result = await verifyUser(testUser.id);

    // Verify user is marked as verified
    expect(result.id).toEqual(testUser.id);
    expect(result.is_verified).toBe(true);
    expect(result.email).toEqual(testUser.email);
    expect(result.username).toEqual(testUser.username);
    expect(typeof result.virtual_balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should save verification status to database', async () => {
    const testUser = await createTestUser(testUserData);

    await verifyUser(testUser.id);

    // Check database for verification status
    const verifiedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(verifiedUsers).toHaveLength(1);
    expect(verifiedUsers[0].is_verified).toBe(true);
  });

  it('should verify already verified user', async () => {
    // Create and verify user first
    const testUser = await createTestUser(testUserData);
    await verifyUser(testUser.id);

    // Verify again
    const result = await verifyUser(testUser.id);

    expect(result.is_verified).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    await expect(verifyUser(999999)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should update timestamp on verification', async () => {
    const testUser = await createTestUser(testUserData);
    const originalTimestamp = testUser.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await verifyUser(testUser.id);

    expect(result.updated_at > originalTimestamp).toBe(true);
  });
});