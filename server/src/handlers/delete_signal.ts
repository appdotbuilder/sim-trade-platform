import { db } from '../db';
import { signalsTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteSignal = async (input: DeleteByIdInput): Promise<{ success: boolean }> => {
  try {
    // Check if the signal exists first
    const existingSignal = await db.select()
      .from(signalsTable)
      .where(eq(signalsTable.id, input.id))
      .execute();

    if (existingSignal.length === 0) {
      throw new Error(`Signal with id ${input.id} not found`);
    }

    // Delete the signal
    const result = await db.delete(signalsTable)
      .where(eq(signalsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Signal deletion failed:', error);
    throw error;
  }
};