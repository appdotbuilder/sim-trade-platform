import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  phone: null,
  country: null
};

// Test transaction input
const testTransactionInput: CreateTransactionInput = {
  user_id: 1,
  type: 'deposit',
  amount: 500.75,
  currency: 'USD',
  description: 'Test deposit transaction',
  reference_id: 'REF123456'
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transaction successfully', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createTransaction(testTransactionInput);

    // Verify transaction fields
    expect(result.user_id).toEqual(1);
    expect(result.type).toEqual('deposit');
    expect(result.amount).toEqual(500.75);
    expect(typeof result.amount).toBe('number');
    expect(result.currency).toEqual('USD');
    expect(result.status).toEqual('pending');
    expect(result.description).toEqual('Test deposit transaction');
    expect(result.reference_id).toEqual('REF123456');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.processed_at).toBeNull();
  });

  it('should save transaction to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createTransaction(testTransactionInput);

    // Query database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    expect(savedTransaction.user_id).toEqual(1);
    expect(savedTransaction.type).toEqual('deposit');
    expect(parseFloat(savedTransaction.amount)).toEqual(500.75);
    expect(savedTransaction.currency).toEqual('USD');
    expect(savedTransaction.status).toEqual('pending');
    expect(savedTransaction.description).toEqual('Test deposit transaction');
    expect(savedTransaction.reference_id).toEqual('REF123456');
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
    expect(savedTransaction.processed_at).toBeNull();
  });

  it('should create transaction with minimal required fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const minimalInput: CreateTransactionInput = {
      user_id: 1,
      type: 'withdrawal',
      amount: 100.50,
      currency: 'EUR'
    };

    const result = await createTransaction(minimalInput);

    expect(result.user_id).toEqual(1);
    expect(result.type).toEqual('withdrawal');
    expect(result.amount).toEqual(100.50);
    expect(result.currency).toEqual('EUR');
    expect(result.status).toEqual('pending');
    expect(result.description).toBeNull();
    expect(result.reference_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle different transaction types', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const transactionTypes = ['deposit', 'withdrawal', 'trade', 'subscription', 'fund_wallet'] as const;

    for (const type of transactionTypes) {
      const input: CreateTransactionInput = {
        user_id: 1,
        type,
        amount: 250.00,
        currency: 'USD',
        description: `Test ${type} transaction`
      };

      const result = await createTransaction(input);

      expect(result.type).toEqual(type);
      expect(result.amount).toEqual(250.00);
      expect(result.description).toEqual(`Test ${type} transaction`);
    }
  });

  it('should handle different currencies', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const currencies = ['USD', 'EUR', 'BTC', 'ETH'];

    for (const currency of currencies) {
      const input: CreateTransactionInput = {
        user_id: 1,
        type: 'deposit',
        amount: 1000.00,
        currency,
        description: `Test ${currency} transaction`
      };

      const result = await createTransaction(input);

      expect(result.currency).toEqual(currency);
      expect(result.amount).toEqual(1000.00);
    }
  });

  it('should handle large transaction amounts', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const largeAmount = 999999.99;
    const input: CreateTransactionInput = {
      user_id: 1,
      type: 'deposit',
      amount: largeAmount,
      currency: 'USD'
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(largeAmount);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const savedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(savedTransactions[0].amount)).toEqual(largeAmount);
  });

  it('should handle null optional fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const input: CreateTransactionInput = {
      user_id: 1,
      type: 'trade',
      amount: 75.25,
      currency: 'USD',
      description: null,
      reference_id: null
    };

    const result = await createTransaction(input);

    expect(result.description).toBeNull();
    expect(result.reference_id).toBeNull();
    expect(result.amount).toEqual(75.25);
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateTransactionInput = {
      user_id: 999, // Non-existent user
      type: 'deposit',
      amount: 100.00,
      currency: 'USD'
    };

    await expect(createTransaction(input)).rejects.toThrow(/user not found/i);
  });

  it('should create multiple transactions for same user', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const transaction1 = await createTransaction({
      user_id: 1,
      type: 'deposit',
      amount: 500.00,
      currency: 'USD',
      description: 'First transaction'
    });

    const transaction2 = await createTransaction({
      user_id: 1,
      type: 'withdrawal',
      amount: 200.00,
      currency: 'USD',
      description: 'Second transaction'
    });

    expect(transaction1.id).not.toEqual(transaction2.id);
    expect(transaction1.user_id).toEqual(transaction2.user_id);

    // Verify both transactions exist in database
    const allTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, 1))
      .execute();

    expect(allTransactions).toHaveLength(2);
  });
});