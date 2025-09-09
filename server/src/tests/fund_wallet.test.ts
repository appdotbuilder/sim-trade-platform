import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { walletsTable, usersTable, transactionsTable } from '../db/schema';
import { type FundWalletInput } from '../schema';
import { fundWallet } from '../handlers/fund_wallet';
import { eq, and } from 'drizzle-orm';

describe('fundWallet', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const user = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    
    testUserId = user[0].id;
  });

  it('should create a new wallet when none exists for the currency', async () => {
    const input: FundWalletInput = {
      user_id: testUserId,
      currency: 'BTC',
      amount: 1.5,
      external_reference: 'ext-ref-123'
    };

    const result = await fundWallet(input);

    // Verify wallet properties
    expect(result.user_id).toEqual(testUserId);
    expect(result.currency).toEqual('BTC');
    expect(result.balance).toEqual(1.5);
    expect(result.available_balance).toEqual(1.5);
    expect(result.locked_balance).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric field types
    expect(typeof result.balance).toBe('number');
    expect(typeof result.available_balance).toBe('number');
    expect(typeof result.locked_balance).toBe('number');
  });

  it('should update existing wallet balance when wallet exists', async () => {
    // Create initial wallet
    await db.insert(walletsTable)
      .values({
        user_id: testUserId,
        currency: 'ETH',
        balance: '2.0',
        available_balance: '1.8',
        locked_balance: '0.2'
      })
      .execute();

    const input: FundWalletInput = {
      user_id: testUserId,
      currency: 'ETH',
      amount: 0.5
    };

    const result = await fundWallet(input);

    // Verify updated balances
    expect(result.user_id).toEqual(testUserId);
    expect(result.currency).toEqual('ETH');
    expect(result.balance).toEqual(2.5); // 2.0 + 0.5
    expect(result.available_balance).toEqual(2.3); // 1.8 + 0.5
    expect(result.locked_balance).toEqual(0.2); // unchanged
  });

  it('should save wallet to database correctly', async () => {
    const input: FundWalletInput = {
      user_id: testUserId,
      currency: 'USDT',
      amount: 1000
    };

    const result = await fundWallet(input);

    // Query the database directly to verify
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.id, result.id))
      .execute();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].user_id).toEqual(testUserId);
    expect(wallets[0].currency).toEqual('USDT');
    expect(parseFloat(wallets[0].balance)).toEqual(1000);
    expect(parseFloat(wallets[0].available_balance)).toEqual(1000);
  });

  it('should create transaction record for funding', async () => {
    const input: FundWalletInput = {
      user_id: testUserId,
      currency: 'BTC',
      amount: 0.1,
      external_reference: 'blockchain-tx-456'
    };

    await fundWallet(input);

    // Verify transaction was created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, testUserId),
        eq(transactionsTable.type, 'fund_wallet')
      ))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(testUserId);
    expect(transactions[0].type).toEqual('fund_wallet');
    expect(parseFloat(transactions[0].amount)).toEqual(0.1);
    expect(transactions[0].currency).toEqual('BTC');
    expect(transactions[0].status).toEqual('completed');
    expect(transactions[0].reference_id).toEqual('blockchain-tx-456');
    expect(transactions[0].processed_at).toBeInstanceOf(Date);
    expect(transactions[0].description).toContain('0.1 BTC');
  });

  it('should handle multiple currencies for same user', async () => {
    const btcInput: FundWalletInput = {
      user_id: testUserId,
      currency: 'BTC',
      amount: 1.0
    };

    const ethInput: FundWalletInput = {
      user_id: testUserId,
      currency: 'ETH',
      amount: 10.0
    };

    const btcWallet = await fundWallet(btcInput);
    const ethWallet = await fundWallet(ethInput);

    // Verify both wallets exist with correct currencies
    expect(btcWallet.currency).toEqual('BTC');
    expect(btcWallet.balance).toEqual(1.0);
    expect(ethWallet.currency).toEqual('ETH');
    expect(ethWallet.balance).toEqual(10.0);
    expect(btcWallet.id).not.toEqual(ethWallet.id);
  });

  it('should handle funding without external reference', async () => {
    const input: FundWalletInput = {
      user_id: testUserId,
      currency: 'ADA',
      amount: 500
    };

    const result = await fundWallet(input);

    expect(result.currency).toEqual('ADA');
    expect(result.balance).toEqual(500);

    // Verify transaction was created without reference
    const transactions = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, testUserId),
        eq(transactionsTable.currency, 'ADA')
      ))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].reference_id).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const input: FundWalletInput = {
      user_id: 99999, // Non-existent user ID
      currency: 'BTC',
      amount: 1.0
    };

    expect(fundWallet(input)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle decimal precision correctly', async () => {
    const input: FundWalletInput = {
      user_id: testUserId,
      currency: 'BTC',
      amount: 0.00000001 // 1 satoshi
    };

    const result = await fundWallet(input);

    expect(result.balance).toEqual(0.00000001);
    expect(result.available_balance).toEqual(0.00000001);

    // Verify precision is maintained in database
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.id, result.id))
      .execute();

    expect(parseFloat(wallets[0].balance)).toEqual(0.00000001);
  });

  it('should accumulate funds correctly with multiple funding operations', async () => {
    const input1: FundWalletInput = {
      user_id: testUserId,
      currency: 'ETH',
      amount: 1.0
    };

    const input2: FundWalletInput = {
      user_id: testUserId,
      currency: 'ETH',
      amount: 2.5
    };

    const input3: FundWalletInput = {
      user_id: testUserId,
      currency: 'ETH',
      amount: 0.5
    };

    await fundWallet(input1);
    await fundWallet(input2);
    const finalResult = await fundWallet(input3);

    // Should accumulate to 4.0 ETH total
    expect(finalResult.balance).toEqual(4.0);
    expect(finalResult.available_balance).toEqual(4.0);

    // Verify 3 transactions were created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.user_id, testUserId),
        eq(transactionsTable.currency, 'ETH')
      ))
      .execute();

    expect(transactions).toHaveLength(3);
  });
});