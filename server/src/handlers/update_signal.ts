import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type UpdateSignalInput, type Signal } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateSignal(input: UpdateSignalInput): Promise<Signal> {
  try {
    // Check if the signal exists
    const existingSignals = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, input.id))
      .execute();

    if (existingSignals.length === 0) {
      throw new Error(`Signal with id ${input.id} not found`);
    }

    // If asset_id is being updated, verify it exists
    if (input.asset_id !== undefined) {
      const assets = await db.select()
        .from(assetsTable)
        .where(eq(assetsTable.id, input.asset_id))
        .execute();

      if (assets.length === 0) {
        throw new Error(`Asset with id ${input.asset_id} not found`);
      }
    }

    // Build the update object, only including defined fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.asset_id !== undefined) {
      updateData.asset_id = input.asset_id;
    }
    if (input.signal_type !== undefined) {
      updateData.signal_type = input.signal_type;
    }
    if (input.target_price !== undefined) {
      updateData.target_price = input.target_price.toString();
    }
    if (input.quantity !== undefined) {
      updateData.quantity = input.quantity.toString();
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the signal
    const result = await db.update(signalsTable)
      .set(updateData)
      .where(eq(signalsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const signal = result[0];
    return {
      ...signal,
      target_price: parseFloat(signal.target_price),
      quantity: parseFloat(signal.quantity)
    };
  } catch (error) {
    console.error('Signal update failed:', error);
    throw error;
  }
}