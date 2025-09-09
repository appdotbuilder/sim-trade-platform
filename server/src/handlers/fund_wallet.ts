import { db } from '../db';
import { walletsTable, usersTable, transactionsTable } from '../db/schema';
import { type FundWalletInput, type Wallet } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function fundWallet(input: FundWalletInput): Promise<Wallet> {
  try {
    // First verify the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Check if wallet for this currency already exists
    const existingWallet = await db.select()
      .from(walletsTable)
      .where(and(
        eq(walletsTable.user_id, input.user_id),
        eq(walletsTable.currency, input.currency)
      ))
      .execute();

    let wallet;

    if (existingWallet.length > 0) {
      // Update existing wallet balance
      const currentWallet = existingWallet[0];
      const newBalance = parseFloat(currentWallet.balance) + input.amount;
      const newAvailableBalance = parseFloat(currentWallet.available_balance) + input.amount;

      const updatedWallet = await db.update(walletsTable)
        .set({
          balance: newBalance.toString(),
          available_balance: newAvailableBalance.toString(),
          updated_at: new Date()
        })
        .where(eq(walletsTable.id, currentWallet.id))
        .returning()
        .execute();

      wallet = updatedWallet[0];
    } else {
      // Create new wallet
      const newWallet = await db.insert(walletsTable)
        .values({
          user_id: input.user_id,
          currency: input.currency,
          balance: input.amount.toString(),
          available_balance: input.amount.toString(),
          locked_balance: '0'
        })
        .returning()
        .execute();

      wallet = newWallet[0];
    }

    // Create a transaction record for this funding operation
    await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        type: 'fund_wallet',
        amount: input.amount.toString(),
        currency: input.currency,
        status: 'completed',
        description: `Wallet funded with ${input.amount} ${input.currency}`,
        reference_id: input.external_reference || null,
        processed_at: new Date()
      })
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...wallet,
      balance: parseFloat(wallet.balance),
      available_balance: parseFloat(wallet.available_balance),
      locked_balance: parseFloat(wallet.locked_balance)
    };
  } catch (error) {
    console.error('Wallet funding failed:', error);
    throw error;
  }
}