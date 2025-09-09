import { db } from '../db';
import { walletsTable } from '../db/schema';
import { type Wallet } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getUserWallets(userId: number): Promise<Wallet[]> {
  try {
    const results = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(wallet => ({
      ...wallet,
      balance: parseFloat(wallet.balance),
      available_balance: parseFloat(wallet.available_balance),
      locked_balance: parseFloat(wallet.locked_balance)
    }));
  } catch (error) {
    console.error('Failed to fetch user wallets:', error);
    throw error;
  }
}

export async function getWalletByCurrency(userId: number, currency: string): Promise<Wallet | null> {
  try {
    const results = await db.select()
      .from(walletsTable)
      .where(and(
        eq(walletsTable.user_id, userId),
        eq(walletsTable.currency, currency)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const wallet = results[0];
    // Convert numeric fields back to numbers
    return {
      ...wallet,
      balance: parseFloat(wallet.balance),
      available_balance: parseFloat(wallet.available_balance),
      locked_balance: parseFloat(wallet.locked_balance)
    };
  } catch (error) {
    console.error('Failed to fetch wallet by currency:', error);
    throw error;
  }
}