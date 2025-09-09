import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type UpdateCopyTraderInput, type CreateCopyTraderInput } from '../schema';
import { updateCopyTrader } from '../handlers/update_copy_trader';
import { eq } from 'drizzle-orm';

// Helper function to create a test copy trader
const createTestCopyTrader = async (input: CreateCopyTraderInput) => {
  const result = await db.insert(copyTradersTable)
    .values({
      name: input.name,
      trades_won: input.trades_won,
      trades_lost: input.trades_lost,
      followers: input.followers
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateCopyTrader', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a copy trader', async () => {
    // Create test copy trader
    const testCopyTrader = await createTestCopyTrader({
      name: 'Original Trader',
      trades_won: 50,
      trades_lost: 10,
      followers: 100
    });

    const updateInput: UpdateCopyTraderInput = {
      id: testCopyTrader.id,
      name: 'Updated Trader',
      trades_won: 75,
      trades_lost: 15,
      followers: 150
    };

    const result = await updateCopyTrader(updateInput);

    // Validate updated fields
    expect(result.id).toEqual(testCopyTrader.id);
    expect(result.name).toEqual('Updated Trader');
    expect(result.trades_won).toEqual(75);
    expect(result.trades_lost).toEqual(15);
    expect(result.followers).toEqual(150);
    expect(result.created_at).toEqual(testCopyTrader.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testCopyTrader.updated_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    // Create test copy trader
    const testCopyTrader = await createTestCopyTrader({
      name: 'Partial Update Trader',
      trades_won: 30,
      trades_lost: 5,
      followers: 75
    });

    const updateInput: UpdateCopyTraderInput = {
      id: testCopyTrader.id,
      name: 'New Name Only',
      trades_won: 40
    };

    const result = await updateCopyTrader(updateInput);

    // Validate that only specified fields were updated
    expect(result.name).toEqual('New Name Only');
    expect(result.trades_won).toEqual(40);
    expect(result.trades_lost).toEqual(5); // Should remain unchanged
    expect(result.followers).toEqual(75); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testCopyTrader.updated_at).toBe(true);
  });

  it('should update statistics with zero values', async () => {
    // Create test copy trader with existing stats
    const testCopyTrader = await createTestCopyTrader({
      name: 'Reset Stats Trader',
      trades_won: 20,
      trades_lost: 8,
      followers: 50
    });

    const updateInput: UpdateCopyTraderInput = {
      id: testCopyTrader.id,
      trades_won: 0,
      trades_lost: 0,
      followers: 0
    };

    const result = await updateCopyTrader(updateInput);

    // Validate zero values are properly set
    expect(result.trades_won).toEqual(0);
    expect(result.trades_lost).toEqual(0);
    expect(result.followers).toEqual(0);
    expect(result.name).toEqual('Reset Stats Trader'); // Should remain unchanged
  });

  it('should save updated copy trader to database', async () => {
    // Create test copy trader
    const testCopyTrader = await createTestCopyTrader({
      name: 'Database Update Trader',
      trades_won: 12,
      trades_lost: 3,
      followers: 25
    });

    const updateInput: UpdateCopyTraderInput = {
      id: testCopyTrader.id,
      name: 'Updated in DB',
      followers: 30
    };

    const result = await updateCopyTrader(updateInput);

    // Verify the update was persisted in database
    const savedCopyTraders = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, result.id))
      .execute();

    expect(savedCopyTraders).toHaveLength(1);
    expect(savedCopyTraders[0].name).toEqual('Updated in DB');
    expect(savedCopyTraders[0].trades_won).toEqual(12); // Unchanged
    expect(savedCopyTraders[0].trades_lost).toEqual(3); // Unchanged
    expect(savedCopyTraders[0].followers).toEqual(30); // Updated
    expect(savedCopyTraders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when copy trader does not exist', async () => {
    const updateInput: UpdateCopyTraderInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Trader'
    };

    await expect(updateCopyTrader(updateInput)).rejects.toThrow(/Copy trader with id 99999 not found/i);
  });

  it('should handle large statistics values', async () => {
    // Create test copy trader
    const testCopyTrader = await createTestCopyTrader({
      name: 'High Volume Trader',
      trades_won: 1000,
      trades_lost: 200,
      followers: 5000
    });

    const updateInput: UpdateCopyTraderInput = {
      id: testCopyTrader.id,
      trades_won: 10000,
      trades_lost: 2000,
      followers: 50000
    };

    const result = await updateCopyTrader(updateInput);

    // Validate large numbers are handled correctly
    expect(result.trades_won).toEqual(10000);
    expect(result.trades_lost).toEqual(2000);
    expect(result.followers).toEqual(50000);
    expect(typeof result.trades_won).toBe('number');
    expect(typeof result.trades_lost).toBe('number');
    expect(typeof result.followers).toBe('number');
  });
});