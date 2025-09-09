import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const signalTypeEnum = pgEnum('signal_type', ['BUY', 'SELL']);
export const tradeTypeEnum = pgEnum('trade_type', ['BUY', 'SELL']);

// Assets table - stores trading assets with current market prices
export const assetsTable = pgTable('assets', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  current_price: numeric('current_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Copy traders table - stores copy trader information and statistics
export const copyTradersTable = pgTable('copy_traders', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  trades_won: integer('trades_won').notNull().default(0),
  trades_lost: integer('trades_lost').notNull().default(0),
  followers: integer('followers').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Signals table - stores trading signals created by admin
export const signalsTable = pgTable('signals', {
  id: serial('id').primaryKey(),
  asset_id: integer('asset_id').notNull(),
  signal_type: signalTypeEnum('signal_type').notNull(),
  target_price: numeric('target_price', { precision: 10, scale: 2 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Simulated trades table - stores executed simulated trades
export const simulatedTradesTable = pgTable('simulated_trades', {
  id: serial('id').primaryKey(),
  asset_id: integer('asset_id').notNull(),
  trade_type: tradeTypeEnum('trade_type').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  executed_at: timestamp('executed_at').defaultNow().notNull(),
});

// Define relations
export const assetsRelations = relations(assetsTable, ({ many }) => ({
  signals: many(signalsTable),
  simulatedTrades: many(simulatedTradesTable),
}));

export const signalsRelations = relations(signalsTable, ({ one }) => ({
  asset: one(assetsTable, {
    fields: [signalsTable.asset_id],
    references: [assetsTable.id],
  }),
}));

export const simulatedTradesRelations = relations(simulatedTradesTable, ({ one }) => ({
  asset: one(assetsTable, {
    fields: [simulatedTradesTable.asset_id],
    references: [assetsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Asset = typeof assetsTable.$inferSelect;
export type NewAsset = typeof assetsTable.$inferInsert;

export type CopyTrader = typeof copyTradersTable.$inferSelect;
export type NewCopyTrader = typeof copyTradersTable.$inferInsert;

export type Signal = typeof signalsTable.$inferSelect;
export type NewSignal = typeof signalsTable.$inferInsert;

export type SimulatedTrade = typeof simulatedTradesTable.$inferSelect;
export type NewSimulatedTrade = typeof simulatedTradesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  assets: assetsTable, 
  copyTraders: copyTradersTable,
  signals: signalsTable,
  simulatedTrades: simulatedTradesTable
};