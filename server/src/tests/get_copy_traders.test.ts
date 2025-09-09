import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { copyTradersTable } from '../db/schema';
import { getCopyTraders } from '../handlers/get_copy_traders';

describe('getCopyTraders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no copy traders exist', async () => {
    const result = await getCopyTraders();
    expect(result).toEqual([]);
  });

  it('should fetch all copy traders when less than 10', async () => {
    // Create test copy traders
    await db.insert(copyTradersTable)
      .values([
        {
          name: 'Trader Alpha',
          trades_won: 85,
          trades_lost: 15,
          followers: 1200
        },
        {
          name: 'Trader Beta',
          trades_won: 72,
          trades_lost: 28,
          followers: 950
        },
        {
          name: 'Trader Gamma',
          trades_won: 90,
          trades_lost: 10,
          followers: 1500
        }
      ])
      .execute();

    const result = await getCopyTraders();

    expect(result).toHaveLength(3);
    
    // Verify all fields are present
    result.forEach(trader => {
      expect(trader.id).toBeDefined();
      expect(typeof trader.name).toBe('string');
      expect(typeof trader.trades_won).toBe('number');
      expect(typeof trader.trades_lost).toBe('number');
      expect(typeof trader.followers).toBe('number');
      expect(trader.created_at).toBeInstanceOf(Date);
      expect(trader.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should limit results to 10 copy traders', async () => {
    // Create 12 copy traders to test the limit
    const traders = Array.from({ length: 12 }, (_, i) => ({
      name: `Trader ${i + 1}`,
      trades_won: 50 + i,
      trades_lost: 20 + i,
      followers: 100 + (i * 10)
    }));

    await db.insert(copyTradersTable)
      .values(traders)
      .execute();

    const result = await getCopyTraders();

    expect(result).toHaveLength(10);
    
    // Verify each trader has all required fields
    result.forEach(trader => {
      expect(trader.id).toBeDefined();
      expect(trader.name).toBeDefined();
      expect(trader.trades_won).toBeGreaterThanOrEqual(0);
      expect(trader.trades_lost).toBeGreaterThanOrEqual(0);
      expect(trader.followers).toBeGreaterThanOrEqual(0);
    });
  });

  it('should order copy traders by followers descending', async () => {
    // Create traders with different follower counts
    await db.insert(copyTradersTable)
      .values([
        {
          name: 'Low Followers',
          trades_won: 50,
          trades_lost: 20,
          followers: 300
        },
        {
          name: 'High Followers',
          trades_won: 75,
          trades_lost: 25,
          followers: 2000
        },
        {
          name: 'Mid Followers',
          trades_won: 60,
          trades_lost: 15,
          followers: 800
        }
      ])
      .execute();

    const result = await getCopyTraders();

    expect(result).toHaveLength(3);
    
    // Verify ordering by followers (descending)
    expect(result[0].name).toBe('High Followers');
    expect(result[0].followers).toBe(2000);
    expect(result[1].name).toBe('Mid Followers');
    expect(result[1].followers).toBe(800);
    expect(result[2].name).toBe('Low Followers');
    expect(result[2].followers).toBe(300);
    
    // Verify followers are in descending order
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].followers).toBeGreaterThanOrEqual(result[i + 1].followers);
    }
  });

  it('should handle copy traders with zero statistics', async () => {
    // Test with traders that have zero wins, losses, or followers
    await db.insert(copyTradersTable)
      .values([
        {
          name: 'New Trader',
          trades_won: 0,
          trades_lost: 0,
          followers: 0
        },
        {
          name: 'Popular Trader',
          trades_won: 100,
          trades_lost: 5,
          followers: 1500
        }
      ])
      .execute();

    const result = await getCopyTraders();

    expect(result).toHaveLength(2);
    
    // Popular trader should be first (higher followers)
    expect(result[0].name).toBe('Popular Trader');
    expect(result[1].name).toBe('New Trader');
    
    // Verify zero values are handled correctly
    const newTrader = result[1];
    expect(newTrader.trades_won).toBe(0);
    expect(newTrader.trades_lost).toBe(0);
    expect(newTrader.followers).toBe(0);
  });

  it('should return traders with consistent data types', async () => {
    await db.insert(copyTradersTable)
      .values({
        name: 'Type Test Trader',
        trades_won: 42,
        trades_lost: 8,
        followers: 750
      })
      .execute();

    const result = await getCopyTraders();
    const trader = result[0];

    // Verify all field types
    expect(typeof trader.id).toBe('number');
    expect(typeof trader.name).toBe('string');
    expect(typeof trader.trades_won).toBe('number');
    expect(typeof trader.trades_lost).toBe('number');
    expect(typeof trader.followers).toBe('number');
    expect(trader.created_at).toBeInstanceOf(Date);
    expect(trader.updated_at).toBeInstanceOf(Date);
    
    // Verify integer fields are integers
    expect(Number.isInteger(trader.trades_won)).toBe(true);
    expect(Number.isInteger(trader.trades_lost)).toBe(true);
    expect(Number.isInteger(trader.followers)).toBe(true);
  });
});