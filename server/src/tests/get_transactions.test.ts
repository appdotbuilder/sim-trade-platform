import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { getUserTransactions, getTransactionsByType, getDeposits, getWithdrawals } from '../handlers/get_transactions';
import { eq } from 'drizzle-orm';

// Test users data
const testUser1 = {
  email: 'user1@test.com',
  username: 'user1',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  country: 'US'
};

const testUser2 = {
  email: 'user2@test.com',
  username: 'user2', 
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '+0987654321',
  country: 'CA'
};

// Test transactions data
const testTransactions = [
  {
    type: 'deposit' as const,
    amount: 1000.50,
    currency: 'USD',
    description: 'Bank deposit',
    reference_id: 'DEP001'
  },
  {
    type: 'withdrawal' as const,
    amount: 250.75,
    currency: 'USD',
    description: 'ATM withdrawal',
    reference_id: 'WD001'
  },
  {
    type: 'trade' as const,
    amount: 100.25,
    currency: 'USD',
    description: 'Stock purchase',
    reference_id: 'TRD001'
  },
  {
    type: 'subscription' as const,
    amount: 29.99,
    currency: 'USD',
    description: 'Monthly subscription',
    reference_id: 'SUB001'
  },
  {
    type: 'fund_wallet' as const,
    amount: 500.00,
    currency: 'EUR',
    description: 'Wallet funding',
    reference_id: 'FW001'
  }
];

describe('Transaction Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId1: number;
  let userId2: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    userId1 = users[0].id;
    userId2 = users[1].id;
  });

  describe('getUserTransactions', () => {
    it('should return all transactions for a user ordered by created_at desc', async () => {
      // Create transactions for user1
      await db.insert(transactionsTable)
        .values(testTransactions.map(t => ({
          ...t,
          user_id: userId1,
          amount: t.amount.toString()
        })))
        .execute();

      // Create one transaction for user2 to ensure filtering works
      await db.insert(transactionsTable)
        .values([{
          user_id: userId2,
          type: 'deposit',
          amount: '999.99',
          currency: 'USD',
          description: 'User2 deposit'
        }])
        .execute();

      const results = await getUserTransactions(userId1);

      expect(results).toHaveLength(5);
      
      // Verify all transactions belong to user1
      results.forEach(transaction => {
        expect(transaction.user_id).toBe(userId1);
      });

      // Verify numeric conversion
      expect(typeof results[0].amount).toBe('number');
      
      // Verify ordering (most recent first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].created_at >= results[i].created_at).toBe(true);
      }

      // Verify specific amounts are converted correctly
      const amounts = results.map(r => r.amount).sort((a, b) => b - a);
      expect(amounts).toEqual([1000.50, 500.00, 250.75, 100.25, 29.99]);
    });

    it('should return empty array for user with no transactions', async () => {
      const results = await getUserTransactions(userId1);
      expect(results).toHaveLength(0);
    });

    it('should return transactions with all required fields', async () => {
      await db.insert(transactionsTable)
        .values([{
          user_id: userId1,
          type: 'deposit',
          amount: '100.00',
          currency: 'USD',
          description: 'Test deposit',
          reference_id: 'TEST001'
        }])
        .execute();

      const results = await getUserTransactions(userId1);
      const transaction = results[0];

      expect(transaction.id).toBeDefined();
      expect(transaction.user_id).toBe(userId1);
      expect(transaction.type).toBe('deposit');
      expect(transaction.amount).toBe(100.00);
      expect(transaction.currency).toBe('USD');
      expect(transaction.status).toBeDefined();
      expect(transaction.description).toBe('Test deposit');
      expect(transaction.reference_id).toBe('TEST001');
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.processed_at).toBeNull();
    });
  });

  describe('getTransactionsByType', () => {
    beforeEach(async () => {
      // Create mixed transactions for user1
      await db.insert(transactionsTable)
        .values(testTransactions.map(t => ({
          ...t,
          user_id: userId1,
          amount: t.amount.toString()
        })))
        .execute();

      // Create deposit for user2 (should not appear in user1 results)
      await db.insert(transactionsTable)
        .values([{
          user_id: userId2,
          type: 'deposit',
          amount: '777.77',
          currency: 'USD',
          description: 'User2 deposit'
        }])
        .execute();
    });

    it('should return only deposit transactions for user', async () => {
      const results = await getTransactionsByType(userId1, 'deposit');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('deposit');
      expect(results[0].user_id).toBe(userId1);
      expect(results[0].amount).toBe(1000.50);
    });

    it('should return only withdrawal transactions for user', async () => {
      const results = await getTransactionsByType(userId1, 'withdrawal');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('withdrawal');
      expect(results[0].user_id).toBe(userId1);
      expect(results[0].amount).toBe(250.75);
    });

    it('should return only trade transactions for user', async () => {
      const results = await getTransactionsByType(userId1, 'trade');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('trade');
      expect(results[0].user_id).toBe(userId1);
      expect(results[0].amount).toBe(100.25);
    });

    it('should return only subscription transactions for user', async () => {
      const results = await getTransactionsByType(userId1, 'subscription');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('subscription');
      expect(results[0].user_id).toBe(userId1);
      expect(results[0].amount).toBe(29.99);
    });

    it('should return only fund_wallet transactions for user', async () => {
      const results = await getTransactionsByType(userId1, 'fund_wallet');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('fund_wallet');
      expect(results[0].user_id).toBe(userId1);
      expect(results[0].amount).toBe(500.00);
    });

    it('should return empty array when no transactions of specified type exist', async () => {
      // Clear all transactions
      await db.delete(transactionsTable)
        .where(eq(transactionsTable.user_id, userId1))
        .execute();

      const results = await getTransactionsByType(userId1, 'deposit');
      expect(results).toHaveLength(0);
    });

    it('should order results by created_at desc', async () => {
      // Create multiple transactions of same type
      await db.insert(transactionsTable)
        .values([
          {
            user_id: userId1,
            type: 'deposit',
            amount: '200.00',
            currency: 'USD',
            description: 'Second deposit'
          },
          {
            user_id: userId1,
            type: 'deposit', 
            amount: '300.00',
            currency: 'USD',
            description: 'Third deposit'
          }
        ])
        .execute();

      const results = await getTransactionsByType(userId1, 'deposit');
      
      expect(results.length).toBeGreaterThanOrEqual(2);
      
      // Verify ordering
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].created_at >= results[i].created_at).toBe(true);
      }
    });
  });

  describe('getDeposits', () => {
    beforeEach(async () => {
      // Create mixed transactions
      await db.insert(transactionsTable)
        .values([
          {
            user_id: userId1,
            type: 'deposit',
            amount: '1000.00',
            currency: 'USD',
            description: 'First deposit'
          },
          {
            user_id: userId1,
            type: 'deposit',
            amount: '2000.00', 
            currency: 'EUR',
            description: 'Second deposit'
          },
          {
            user_id: userId1,
            type: 'withdrawal',
            amount: '500.00',
            currency: 'USD',
            description: 'Withdrawal'
          },
          {
            user_id: userId2,
            type: 'deposit',
            amount: '999.99',
            currency: 'USD',
            description: 'User2 deposit'
          }
        ])
        .execute();
    });

    it('should return only deposit transactions for user', async () => {
      const results = await getDeposits(userId1);

      expect(results).toHaveLength(2);
      results.forEach(transaction => {
        expect(transaction.type).toBe('deposit');
        expect(transaction.user_id).toBe(userId1);
      });

      // Verify amounts
      const amounts = results.map(r => r.amount).sort((a, b) => b - a);
      expect(amounts).toEqual([2000.00, 1000.00]);
    });

    it('should return empty array when no deposits exist', async () => {
      // Clear all transactions
      await db.delete(transactionsTable)
        .where(eq(transactionsTable.user_id, userId1))
        .execute();

      const results = await getDeposits(userId1);
      expect(results).toHaveLength(0);
    });

    it('should order deposits by created_at desc', async () => {
      const results = await getDeposits(userId1);
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].created_at >= results[i].created_at).toBe(true);
      }
    });

    it('should convert numeric amounts correctly', async () => {
      const results = await getDeposits(userId1);
      
      results.forEach(transaction => {
        expect(typeof transaction.amount).toBe('number');
      });
    });
  });

  describe('getWithdrawals', () => {
    beforeEach(async () => {
      // Create mixed transactions
      await db.insert(transactionsTable)
        .values([
          {
            user_id: userId1,
            type: 'withdrawal',
            amount: '100.50',
            currency: 'USD',
            description: 'First withdrawal'
          },
          {
            user_id: userId1,
            type: 'withdrawal',
            amount: '250.75',
            currency: 'EUR',
            description: 'Second withdrawal'
          },
          {
            user_id: userId1,
            type: 'deposit',
            amount: '1000.00',
            currency: 'USD',
            description: 'Deposit'
          },
          {
            user_id: userId2,
            type: 'withdrawal',
            amount: '333.33',
            currency: 'USD',
            description: 'User2 withdrawal'
          }
        ])
        .execute();
    });

    it('should return only withdrawal transactions for user', async () => {
      const results = await getWithdrawals(userId1);

      expect(results).toHaveLength(2);
      results.forEach(transaction => {
        expect(transaction.type).toBe('withdrawal');
        expect(transaction.user_id).toBe(userId1);
      });

      // Verify amounts
      const amounts = results.map(r => r.amount).sort((a, b) => b - a);
      expect(amounts).toEqual([250.75, 100.50]);
    });

    it('should return empty array when no withdrawals exist', async () => {
      // Clear all transactions
      await db.delete(transactionsTable)
        .where(eq(transactionsTable.user_id, userId1))
        .execute();

      const results = await getWithdrawals(userId1);
      expect(results).toHaveLength(0);
    });

    it('should order withdrawals by created_at desc', async () => {
      const results = await getWithdrawals(userId1);
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].created_at >= results[i].created_at).toBe(true);
      }
    });

    it('should convert numeric amounts correctly', async () => {
      const results = await getWithdrawals(userId1);
      
      results.forEach(transaction => {
        expect(typeof transaction.amount).toBe('number');
      });
    });

    it('should include all transaction fields', async () => {
      const results = await getWithdrawals(userId1);
      const transaction = results[0];

      expect(transaction.id).toBeDefined();
      expect(transaction.user_id).toBe(userId1);
      expect(transaction.type).toBe('withdrawal');
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.currency).toBeDefined();
      expect(transaction.status).toBeDefined();
      expect(transaction.created_at).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user_id gracefully', async () => {
      const nonExistentUserId = 99999;
      
      const results = await getUserTransactions(nonExistentUserId);
      expect(results).toHaveLength(0);
    });

    it('should handle database connection issues', async () => {
      // This test would require mocking database connection
      // For now, we verify handlers don't crash with valid inputs
      const results = await getUserTransactions(userId1);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});