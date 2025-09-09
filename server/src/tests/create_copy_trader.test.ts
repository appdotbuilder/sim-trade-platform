import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { type CreateCopyTraderInput } from '../schema';
import { createCopyTrader } from '../handlers/create_copy_trader';
import { eq } from 'drizzle-orm';

// Test input for creating a copy trader
const testInput: CreateCopyTraderInput = {
  name: 'Test Trader',
  trades_won: 25,
  trades_lost: 5,
  followers: 150
};

describe('createCopyTrader', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a copy trader', async () => {
    const result = await createCopyTrader(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Trader');
    expect(result.trades_won).toEqual(25);
    expect(result.trades_lost).toEqual(5);
    expect(result.followers).toEqual(150);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save copy trader to database', async () => {
    const result = await createCopyTrader(testInput);

    // Query using proper drizzle syntax
    const copyTraders = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, result.id))
      .execute();

    expect(copyTraders).toHaveLength(1);
    expect(copyTraders[0].name).toEqual('Test Trader');
    expect(copyTraders[0].trades_won).toEqual(25);
    expect(copyTraders[0].trades_lost).toEqual(5);
    expect(copyTraders[0].followers).toEqual(150);
    expect(copyTraders[0].created_at).toBeInstanceOf(Date);
    expect(copyTraders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create copy trader with zero statistics', async () => {
    const zeroStatsInput: CreateCopyTraderInput = {
      name: 'New Trader',
      trades_won: 0,
      trades_lost: 0,
      followers: 0
    };

    const result = await createCopyTrader(zeroStatsInput);

    expect(result.name).toEqual('New Trader');
    expect(result.trades_won).toEqual(0);
    expect(result.trades_lost).toEqual(0);
    expect(result.followers).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const copyTraders = await db.select()
      .from(copyTradersTable)
      .where(eq(copyTradersTable.id, result.id))
      .execute();

    expect(copyTraders[0].trades_won).toEqual(0);
    expect(copyTraders[0].trades_lost).toEqual(0);
    expect(copyTraders[0].followers).toEqual(0);
  });

  it('should create multiple copy traders successfully', async () => {
    const firstInput: CreateCopyTraderInput = {
      name: 'Trader One',
      trades_won: 10,
      trades_lost: 2,
      followers: 50
    };

    const secondInput: CreateCopyTraderInput = {
      name: 'Trader Two',
      trades_won: 15,
      trades_lost: 3,
      followers: 75
    };

    const firstResult = await createCopyTrader(firstInput);
    const secondResult = await createCopyTrader(secondInput);

    // Verify different IDs
    expect(firstResult.id).not.toEqual(secondResult.id);

    // Verify first trader
    expect(firstResult.name).toEqual('Trader One');
    expect(firstResult.trades_won).toEqual(10);
    expect(firstResult.trades_lost).toEqual(2);
    expect(firstResult.followers).toEqual(50);

    // Verify second trader
    expect(secondResult.name).toEqual('Trader Two');
    expect(secondResult.trades_won).toEqual(15);
    expect(secondResult.trades_lost).toEqual(3);
    expect(secondResult.followers).toEqual(75);

    // Verify both exist in database
    const allTraders = await db.select()
      .from(copyTradersTable)
      .execute();

    expect(allTraders).toHaveLength(2);
  });

  it('should handle long trader names', async () => {
    const longNameInput: CreateCopyTraderInput = {
      name: 'A Very Long Copy Trader Name That Should Still Work',
      trades_won: 100,
      trades_lost: 20,
      followers: 500
    };

    const result = await createCopyTrader(longNameInput);

    expect(result.name).toEqual('A Very Long Copy Trader Name That Should Still Work');
    expect(result.trades_won).toEqual(100);
    expect(result.trades_lost).toEqual(20);
    expect(result.followers).toEqual(500);
    expect(result.id).toBeDefined();
  });
});