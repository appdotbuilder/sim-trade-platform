import { db } from '../db';
import { tradesTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateTradeInput, type Trade } from '../schema';

export const createTrade = async (input: CreateTradeInput): Promise<Trade> => {
  try {
    // First verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Calculate trade value
    const tradeValue = input.quantity * input.entry_price;
    const currentBalance = parseFloat(user[0].virtual_balance);

    // Check if user has sufficient virtual balance for buy trades
    if (input.trade_type === 'buy' && currentBalance < tradeValue) {
      throw new Error(`Insufficient virtual balance. Required: ${tradeValue}, Available: ${currentBalance}`);
    }

    // Insert the trade record
    const result = await db.insert(tradesTable)
      .values({
        user_id: input.user_id,
        symbol: input.symbol,
        asset_type: input.asset_type,
        trade_type: input.trade_type,
        quantity: input.quantity.toString(),
        entry_price: input.entry_price.toString(),
        status: 'executed'
      })
      .returning()
      .execute();

    // Update user's virtual balance based on trade type
    let newBalance: number;
    if (input.trade_type === 'buy') {
      newBalance = currentBalance - tradeValue;
    } else {
      // For sell trades, add the value to balance
      newBalance = currentBalance + tradeValue;
    }

    await db.update(usersTable)
      .set({ 
        virtual_balance: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    const trade = result[0];
    return {
      ...trade,
      quantity: parseFloat(trade.quantity),
      entry_price: parseFloat(trade.entry_price),
      exit_price: trade.exit_price ? parseFloat(trade.exit_price) : null,
      profit_loss: trade.profit_loss ? parseFloat(trade.profit_loss) : null
    };
  } catch (error) {
    console.error('Trade creation failed:', error);
    throw error;
  }
};