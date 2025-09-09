import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type DeleteByIdInput, type CreateCopyTraderInput } from '../schema';
import { deleteCopyTrader } from '../handlers/delete_copy_trader';
import { eq } from 'drizzle-orm';

// Test input for creating a copy trader to delete
const testCreateInput: CreateCopyTraderInput = {
  name: 'Test Trader',
  trades_won: 15,
  trades_lost: 5,
  followers: 200
};

// Test input for deletion
const testDeleteInput: DeleteByIdInput = {
  id: 1
};

describe('deleteCopyTrader', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing copy trader', async () => {
    // Create a copy trader first
    const created = await db.insert(copyTradersTable)
      .values({
        name: testCreateInput.name,
        trades_won: testCreateInput.trades_won,
        trades_lost: testCreateInput.trades_lost,
        followers: testCreateInput.followers
      })
      .returning()
      .execute();

    const createdId = created[0].id;

    // Delete the copy trader
    const result = await deleteCopyTrader({ id: createdId });

    expect(result.success).toBe(true);

    // Verify the copy trader no longer exists in database
    const traders = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, createdId))
      .execute();

    expect(traders).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent copy trader', async () => {
    // Try to delete a copy trader that doesn't exist
    expect(deleteCopyTrader({ id: 999 }))
      .rejects.toThrow(/copy trader with id 999 not found/i);
  });

  it('should not affect other copy traders when deleting one', async () => {
    // Create multiple copy traders
    const trader1 = await db.insert(copyTradersTable)
      .values({
        name: 'Trader One',
        trades_won: 10,
        trades_lost: 2,
        followers: 150
      })
      .returning()
      .execute();

    const trader2 = await db.insert(copyTradersTable)
      .values({
        name: 'Trader Two',
        trades_won: 20,
        trades_lost: 8,
        followers: 300
      })
      .returning()
      .execute();

    // Delete only the first trader
    const result = await deleteCopyTrader({ id: trader1[0].id });

    expect(result.success).toBe(true);

    // Verify only the first trader is deleted
    const remainingTraders = await db.select()
      .from(copyTradersTable)
      .execute();

    expect(remainingTraders).toHaveLength(1);
    expect(remainingTraders[0].id).toEqual(trader2[0].id);
    expect(remainingTraders[0].name).toEqual('Trader Two');
  });

  it('should verify database state after successful deletion', async () => {
    // Create a copy trader
    const created = await db.insert(copyTradersTable)
      .values({
        name: 'Database Test Trader',
        trades_won: 25,
        trades_lost: 10,
        followers: 500
      })
      .returning()
      .execute();

    const createdId = created[0].id;

    // Verify trader exists before deletion
    let traders = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, createdId))
      .execute();

    expect(traders).toHaveLength(1);
    expect(traders[0].name).toEqual('Database Test Trader');

    // Delete the trader
    await deleteCopyTrader({ id: createdId });

    // Verify trader no longer exists
    traders = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, createdId))
      .execute();

    expect(traders).toHaveLength(0);

    // Verify total count is zero
    const allTraders = await db.select()
      .from(copyTradersTable)
      .execute();

    expect(allTraders).toHaveLength(0);
  });
});