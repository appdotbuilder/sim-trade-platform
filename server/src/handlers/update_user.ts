import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.first_name !== undefined) {
      updateData.first_name = input.first_name;
    }
    if (input.last_name !== undefined) {
      updateData.last_name = input.last_name;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.country !== undefined) {
      updateData.country = input.country;
    }
    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }

    // Update user and return updated record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    const user = result[0];
    return {
      ...user,
      virtual_balance: parseFloat(user.virtual_balance) // Convert numeric to number
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function verifyUser(userId: number): Promise<User> {
  try {
    // Update user verification status
    const result = await db.update(usersTable)
      .set({
        is_verified: true,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    const user = result[0];
    return {
      ...user,
      virtual_balance: parseFloat(user.virtual_balance) // Convert numeric to number
    };
  } catch (error) {
    console.error('User verification failed:', error);
    throw error;
  }
}