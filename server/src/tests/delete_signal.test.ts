import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { deleteSignal } from '../handlers/delete_signal';
import { eq } from 'drizzle-orm';

// Test input for deleting a signal
const testDeleteInput: DeleteByIdInput = {
  id: 1
};

describe('deleteSignal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing signal', async () => {
    // First create an asset (required for foreign key)
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: '45000.00'
      })
      .returning()
      .execute();

    // Create a test signal
    const signalResult = await db.insert(signalsTable)
      .values({
        asset_id: assetResult[0].id,
        signal_type: 'BUY',
        target_price: '46000.00',
        quantity: '1.5000',
        description: 'Test buy signal',
        is_active: true
      })
      .returning()
      .execute();

    const signalId = signalResult[0].id;

    // Delete the signal
    const result = await deleteSignal({ id: signalId });

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify signal no longer exists in database
    const deletedSignal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, signalId))
      .execute();

    expect(deletedSignal).toHaveLength(0);
  });

  it('should throw error when signal does not exist', async () => {
    const nonExistentId = 999;

    // Attempt to delete non-existent signal
    await expect(deleteSignal({ id: nonExistentId }))
      .rejects.toThrow(/Signal with id 999 not found/);
  });

  it('should handle multiple signals correctly', async () => {
    // Create an asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ETH',
        name: 'Ethereum',
        current_price: '2500.00'
      })
      .returning()
      .execute();

    // Create multiple test signals
    const signal1Result = await db.insert(signalsTable)
      .values({
        asset_id: assetResult[0].id,
        signal_type: 'BUY',
        target_price: '2600.00',
        quantity: '10.0000',
        description: 'First signal',
        is_active: true
      })
      .returning()
      .execute();

    const signal2Result = await db.insert(signalsTable)
      .values({
        asset_id: assetResult[0].id,
        signal_type: 'SELL',
        target_price: '2400.00',
        quantity: '5.0000',
        description: 'Second signal',
        is_active: false
      })
      .returning()
      .execute();

    // Delete only the first signal
    const result = await deleteSignal({ id: signal1Result[0].id });
    expect(result.success).toBe(true);

    // Verify first signal is deleted
    const deletedSignal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, signal1Result[0].id))
      .execute();
    expect(deletedSignal).toHaveLength(0);

    // Verify second signal still exists
    const remainingSignal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, signal2Result[0].id))
      .execute();
    expect(remainingSignal).toHaveLength(1);
    expect(remainingSignal[0].description).toBe('Second signal');
  });

  it('should verify signal exists before deletion', async () => {
    // Create an asset
    const assetResult = await db.insert(assetsTable)
      .values({
        symbol: 'ADA',
        name: 'Cardano',
        current_price: '0.45'
      })
      .returning()
      .execute();

    // Create a signal
    const signalResult = await db.insert(signalsTable)
      .values({
        asset_id: assetResult[0].id,
        signal_type: 'BUY',
        target_price: '0.50',
        quantity: '1000.0000',
        description: 'Cardano buy signal',
        is_active: true
      })
      .returning()
      .execute();

    const signalId = signalResult[0].id;

    // Verify signal exists before deletion
    const signalBeforeDeletion = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, signalId))
      .execute();
    expect(signalBeforeDeletion).toHaveLength(1);

    // Delete the signal
    await deleteSignal({ id: signalId });

    // Verify signal no longer exists after deletion
    const signalAfterDeletion = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, signalId))
      .execute();
    expect(signalAfterDeletion).toHaveLength(0);
  });
});