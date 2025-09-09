import { db } from '../db';
import { signalsTable, assetsTable } from '../db/schema';
import { type CreateSignalInput, type Signal } from '../schema';
import { eq } from 'drizzle-orm';

export const createSignal = async (input: CreateSignalInput): Promise<Signal> => {
  try {
    // First, verify that the referenced asset exists
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (asset.length === 0) {
      throw new Error(`Asset with id ${input.asset_id} does not exist`);
    }

    // Insert signal record
    const result = await db.insert(signalsTable)
      .values({
        asset_id: input.asset_id,
        signal_type: input.signal_type,
        target_price: input.target_price.toString(), // Convert number to string for numeric column
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        description: input.description,
        is_active: input.is_active // Boolean column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const signal = result[0];
    return {
      ...signal,
      target_price: parseFloat(signal.target_price), // Convert string back to number
      quantity: parseFloat(signal.quantity) // Convert string back to number
    };
  } catch (error) {
    console.error('Signal creation failed:', error);
    throw error;
  }
};