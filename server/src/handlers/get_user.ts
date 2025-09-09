import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function getUser(userId: number): Promise<User | null> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      ...user,
      virtual_balance: parseFloat(user.virtual_balance) // Convert numeric to number
    };
  } catch (error) {
    console.error('User fetch by ID failed:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      ...user,
      virtual_balance: parseFloat(user.virtual_balance) // Convert numeric to number
    };
  } catch (error) {
    console.error('User fetch by email failed:', error);
    throw error;
  }
}