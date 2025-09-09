import { db } from '../db';
import { assetsTable, copyTradersTable, signalsTable } from '../db/schema';
import { count } from 'drizzle-orm';

export async function seedInitialData(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if database already has data to avoid duplicates
    const [assetCount] = await db.select({ count: count() }).from(assetsTable).execute();
    const [traderCount] = await db.select({ count: count() }).from(copyTradersTable).execute();

    if (assetCount.count > 0 || traderCount.count > 0) {
      return {
        success: false,
        message: 'Database already contains data. Seeding skipped to avoid duplicates.'
      };
    }

    // Sample trading assets with realistic prices
    const sampleAssets = [
      { symbol: 'BTC', name: 'Bitcoin', current_price: '65432.10' },
      { symbol: 'ETH', name: 'Ethereum', current_price: '3456.78' },
      { symbol: 'AAPL', name: 'Apple Inc.', current_price: '189.45' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', current_price: '142.38' },
      { symbol: 'TSLA', name: 'Tesla Inc.', current_price: '248.92' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', current_price: '378.56' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', current_price: '145.23' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', current_price: '478.90' },
      { symbol: 'META', name: 'Meta Platforms Inc.', current_price: '298.34' },
      { symbol: 'NFLX', name: 'Netflix Inc.', current_price: '445.67' }
    ];

    // Insert assets
    const insertedAssets = await db.insert(assetsTable)
      .values(sampleAssets)
      .returning()
      .execute();

    // Sample copy traders with diverse statistics
    const sampleTraders = [
      { name: 'CryptoKing2024', trades_won: 156, trades_lost: 44, followers: 2340 },
      { name: 'TechStockGuru', trades_won: 89, trades_lost: 23, followers: 1876 },
      { name: 'DayTraderPro', trades_won: 234, trades_lost: 78, followers: 3421 },
      { name: 'SwingMaster', trades_won: 67, trades_lost: 15, followers: 987 },
      { name: 'ForexNinja', trades_won: 123, trades_lost: 34, followers: 1654 },
      { name: 'BullMarketBoss', trades_won: 198, trades_lost: 67, followers: 2987 },
      { name: 'ValueInvestor', trades_won: 78, trades_lost: 12, followers: 1432 },
      { name: 'TrendFollower', trades_won: 145, trades_lost: 56, followers: 2156 },
      { name: 'RiskManager', trades_won: 101, trades_lost: 29, followers: 1765 },
      { name: 'AlgoTrader', trades_won: 267, trades_lost: 83, followers: 3654 }
    ];

    // Insert copy traders
    const insertedTraders = await db.insert(copyTradersTable)
      .values(sampleTraders)
      .returning()
      .execute();

    // Sample trading signals using the inserted assets
    const sampleSignals = [
      {
        asset_id: insertedAssets[0].id, // BTC
        signal_type: 'BUY' as const,
        target_price: '67000.00',
        quantity: '0.5000',
        description: 'Strong bullish momentum expected',
        is_active: true
      },
      {
        asset_id: insertedAssets[1].id, // ETH
        signal_type: 'BUY' as const,
        target_price: '3600.00',
        quantity: '2.0000',
        description: 'Breaking resistance level',
        is_active: true
      },
      {
        asset_id: insertedAssets[2].id, // AAPL
        signal_type: 'SELL' as const,
        target_price: '185.00',
        quantity: '50.0000',
        description: 'Overbought conditions',
        is_active: true
      },
      {
        asset_id: insertedAssets[3].id, // GOOGL
        signal_type: 'BUY' as const,
        target_price: '150.00',
        quantity: '25.0000',
        description: 'Earnings beat expected',
        is_active: false
      },
      {
        asset_id: insertedAssets[4].id, // TSLA
        signal_type: 'BUY' as const,
        target_price: '260.00',
        quantity: '10.0000',
        description: 'Production numbers looking strong',
        is_active: true
      },
      {
        asset_id: insertedAssets[7].id, // NVDA
        signal_type: 'SELL' as const,
        target_price: '450.00',
        quantity: '15.0000',
        description: 'Profit taking recommended',
        is_active: true
      }
    ];

    // Insert signals
    await db.insert(signalsTable)
      .values(sampleSignals)
      .returning()
      .execute();

    return {
      success: true,
      message: `Successfully seeded database with ${insertedAssets.length} assets, ${insertedTraders.length} copy traders, and ${sampleSignals.length} signals`
    };

  } catch (error) {
    console.error('Failed to seed initial data:', error);
    throw error;
  }
}