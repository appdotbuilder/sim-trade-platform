import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const tradeStatusEnum = pgEnum('trade_status', ['pending', 'executed', 'cancelled', 'closed']);
export const tradeTypeEnum = pgEnum('trade_type', ['buy', 'sell']);
export const assetTypeEnum = pgEnum('asset_type', ['crypto', 'stock', 'forex']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'trade', 'subscription', 'fund_wallet']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'cancelled']);
export const educationLevelEnum = pgEnum('education_level', ['beginner', 'intermediate', 'advanced']);
export const copyTradeStatusEnum = pgEnum('copy_trade_status', ['pending', 'executed', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'),
  country: text('country'),
  is_verified: boolean('is_verified').notNull().default(false),
  avatar_url: text('avatar_url'),
  virtual_balance: numeric('virtual_balance', { precision: 15, scale: 2 }).notNull().default('10000.00'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Trades table
export const tradesTable = pgTable('trades', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  symbol: text('symbol').notNull(),
  asset_type: assetTypeEnum('asset_type').notNull(),
  trade_type: tradeTypeEnum('trade_type').notNull(),
  quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
  entry_price: numeric('entry_price', { precision: 15, scale: 8 }).notNull(),
  exit_price: numeric('exit_price', { precision: 15, scale: 8 }),
  status: tradeStatusEnum('status').notNull().default('pending'),
  profit_loss: numeric('profit_loss', { precision: 15, scale: 2 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  closed_at: timestamp('closed_at')
});

// Traders table for copy trading
export const tradersTable = pgTable('traders', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  display_name: text('display_name').notNull(),
  bio: text('bio'),
  total_followers: integer('total_followers').notNull().default(0),
  profit_percentage: numeric('profit_percentage', { precision: 5, scale: 2 }).notNull().default('0.00'),
  win_rate: numeric('win_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
  total_trades: integer('total_trades').notNull().default(0),
  subscription_price: numeric('subscription_price', { precision: 10, scale: 2 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Subscriptions table
export const subscriptionsTable = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  subscriber_id: integer('subscriber_id').notNull().references(() => usersTable.id),
  trader_id: integer('trader_id').notNull().references(() => tradersTable.id),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  start_date: timestamp('start_date').defaultNow().notNull(),
  end_date: timestamp('end_date'),
  price_paid: numeric('price_paid', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Signals table
export const signalsTable = pgTable('signals', {
  id: serial('id').primaryKey(),
  trader_id: integer('trader_id').notNull().references(() => tradersTable.id),
  symbol: text('symbol').notNull(),
  asset_type: assetTypeEnum('asset_type').notNull(),
  signal_type: tradeTypeEnum('signal_type').notNull(),
  entry_price: numeric('entry_price', { precision: 15, scale: 8 }).notNull(),
  stop_loss: numeric('stop_loss', { precision: 15, scale: 8 }),
  take_profit: numeric('take_profit', { precision: 15, scale: 8 }),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at')
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  status: transactionStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  reference_id: text('reference_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  processed_at: timestamp('processed_at')
});

// Educational content table
export const educationalContentTable = pgTable('educational_content', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  video_url: text('video_url').notNull(),
  thumbnail_url: text('thumbnail_url'),
  duration: integer('duration'),
  category: text('category').notNull(),
  level: educationLevelEnum('level').notNull(),
  is_featured: boolean('is_featured').notNull().default(false),
  view_count: integer('view_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Price feeds table for simulated real-time data
export const priceFeedsTable = pgTable('price_feeds', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  asset_type: assetTypeEnum('asset_type').notNull(),
  current_price: numeric('current_price', { precision: 15, scale: 8 }).notNull(),
  price_change_24h: numeric('price_change_24h', { precision: 15, scale: 8 }).notNull(),
  price_change_percentage_24h: numeric('price_change_percentage_24h', { precision: 5, scale: 2 }).notNull(),
  volume_24h: numeric('volume_24h', { precision: 20, scale: 2 }).notNull(),
  market_cap: numeric('market_cap', { precision: 20, scale: 2 }),
  last_updated: timestamp('last_updated').defaultNow().notNull()
});

// Copy trades table for tracking copied trades
export const copyTradesTable = pgTable('copy_trades', {
  id: serial('id').primaryKey(),
  subscriber_id: integer('subscriber_id').notNull().references(() => usersTable.id),
  trader_id: integer('trader_id').notNull().references(() => tradersTable.id),
  signal_id: integer('signal_id').notNull().references(() => signalsTable.id),
  original_trade_id: integer('original_trade_id').references(() => tradesTable.id),
  copied_trade_id: integer('copied_trade_id').references(() => tradesTable.id),
  status: copyTradeStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  executed_at: timestamp('executed_at')
});

// Wallets table for fund management
export const walletsTable = pgTable('wallets', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  currency: text('currency').notNull(),
  balance: numeric('balance', { precision: 20, scale: 8 }).notNull().default('0.00000000'),
  available_balance: numeric('available_balance', { precision: 20, scale: 8 }).notNull().default('0.00000000'),
  locked_balance: numeric('locked_balance', { precision: 20, scale: 8 }).notNull().default('0.00000000'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  trades: many(tradesTable),
  traderProfile: one(tradersTable),
  subscriptions: many(subscriptionsTable, { relationName: 'subscriber' }),
  transactions: many(transactionsTable),
  copyTrades: many(copyTradesTable, { relationName: 'subscriber' }),
  wallets: many(walletsTable)
}));

export const tradesRelations = relations(tradesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [tradesTable.user_id],
    references: [usersTable.id]
  })
}));

export const tradersRelations = relations(tradersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tradersTable.user_id],
    references: [usersTable.id]
  }),
  subscriptions: many(subscriptionsTable),
  signals: many(signalsTable),
  copyTrades: many(copyTradesTable, { relationName: 'trader' })
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one }) => ({
  subscriber: one(usersTable, {
    fields: [subscriptionsTable.subscriber_id],
    references: [usersTable.id],
    relationName: 'subscriber'
  }),
  trader: one(tradersTable, {
    fields: [subscriptionsTable.trader_id],
    references: [tradersTable.id]
  })
}));

export const signalsRelations = relations(signalsTable, ({ one, many }) => ({
  trader: one(tradersTable, {
    fields: [signalsTable.trader_id],
    references: [tradersTable.id]
  }),
  copyTrades: many(copyTradesTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  })
}));

export const copyTradesRelations = relations(copyTradesTable, ({ one }) => ({
  subscriber: one(usersTable, {
    fields: [copyTradesTable.subscriber_id],
    references: [usersTable.id],
    relationName: 'subscriber'
  }),
  trader: one(tradersTable, {
    fields: [copyTradesTable.trader_id],
    references: [tradersTable.id],
    relationName: 'trader'
  }),
  signal: one(signalsTable, {
    fields: [copyTradesTable.signal_id],
    references: [signalsTable.id]
  }),
  originalTrade: one(tradesTable, {
    fields: [copyTradesTable.original_trade_id],
    references: [tradesTable.id],
    relationName: 'original'
  }),
  copiedTrade: one(tradesTable, {
    fields: [copyTradesTable.copied_trade_id],
    references: [tradesTable.id],
    relationName: 'copied'
  })
}));

export const walletsRelations = relations(walletsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [walletsTable.user_id],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  trades: tradesTable,
  traders: tradersTable,
  subscriptions: subscriptionsTable,
  signals: signalsTable,
  transactions: transactionsTable,
  educationalContent: educationalContentTable,
  priceFeeds: priceFeedsTable,
  copyTrades: copyTradesTable,
  wallets: walletsTable
};