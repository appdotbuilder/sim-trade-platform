import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction, type TransactionType } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getUserTransactions(userId: number): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch user transactions:', error);
    throw error;
  }
}

export async function getTransactionsByType(userId: number, type: TransactionType): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, userId),
        eq(transactionsTable.type, type)
      ))
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions by type:', error);
    throw error;
  }
}

export async function getDeposits(userId: number): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, userId),
        eq(transactionsTable.type, 'deposit')
      ))
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch deposits:', error);
    throw error;
  }
}

export async function getWithdrawals(userId: number): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, userId),
        eq(transactionsTable.type, 'withdrawal')
      ))
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch withdrawals:', error);
    throw error;
  }
}