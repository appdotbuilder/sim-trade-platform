import { db } from '../db';
import { tradesTable, usersTable } from '../db/schema';
import { type CloseTradeInput, type Trade } from '../schema';
import { eq } from 'drizzle-orm';

export const closeTrade = async (input: CloseTradeInput): Promise<Trade> => {
  try {
    // First, get the trade to ensure it exists and is in the correct status
    const existingTrades = await db.select()
      .from(tradesTable)
      .where(eq(tradesTable.id, input.id))
      .execute();

    if (existingTrades.length === 0) {
      throw new Error('Trade not found');
    }

    const trade = existingTrades[0];

    // Check if trade is already closed
    if (trade.status === 'closed' || trade.status === 'cancelled') {
      throw new Error('Trade is already closed or cancelled');
    }

    // Calculate profit/loss based on trade type
    let profitLoss: number;
    const quantity = parseFloat(trade.quantity);
    const entryPrice = parseFloat(trade.entry_price);
    const exitPrice = input.exit_price;

    if (trade.trade_type === 'buy') {
      // For buy trades: profit = (exit_price - entry_price) * quantity
      profitLoss = (exitPrice - entryPrice) * quantity;
    } else {
      // For sell trades: profit = (entry_price - exit_price) * quantity
      profitLoss = (entryPrice - exitPrice) * quantity;
    }

    // Update the trade with exit price, profit/loss, status, and closed_at
    const updatedTrades = await db.update(tradesTable)
      .set({
        exit_price: input.exit_price.toString(),
        profit_loss: profitLoss.toString(),
        status: 'closed',
        closed_at: new Date()
      })
      .where(eq(tradesTable.id, input.id))
      .returning()
      .execute();

    const updatedTrade = updatedTrades[0];

    // Get the current user balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, trade.user_id))
      .execute();

    const currentBalance = parseFloat(users[0].virtual_balance);
    const newBalance = currentBalance + profitLoss;

    // Update user's virtual balance
    await db.update(usersTable)
      .set({
        virtual_balance: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, trade.user_id))
      .execute();

    // Return the updated trade with proper type conversions
    return {
      ...updatedTrade,
      quantity: parseFloat(updatedTrade.quantity),
      entry_price: parseFloat(updatedTrade.entry_price),
      exit_price: parseFloat(updatedTrade.exit_price!),
      profit_loss: parseFloat(updatedTrade.profit_loss!)
    };
  } catch (error) {
    console.error('Trade closure failed:', error);
    throw error;
  }
};