import { db } from '../db';
import { usersTable, walletsTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone || null,
        country: input.country || null,
        virtual_balance: '10000.00' // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const user = result[0];

    // Create default virtual wallet for the user
    await db.insert(walletsTable)
      .values({
        user_id: user.id,
        currency: 'USD',
        balance: '10000.00', // Convert number to string for numeric column
        available_balance: '10000.00',
        locked_balance: '0.00'
      })
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...user,
      virtual_balance: parseFloat(user.virtual_balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};