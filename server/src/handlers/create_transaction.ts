import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        currency: input.currency,
        description: input.description || null,
        reference_id: input.reference_id || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};