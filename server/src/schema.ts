import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  is_verified: z.boolean(),
  avatar_url: z.string().nullable(),
  virtual_balance: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: z.string().nullable().optional(),
  country: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating user profile
export const updateUserInputSchema = z.object({
  id: z.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Trade status enum
export const tradeStatusEnum = z.enum(['pending', 'executed', 'cancelled', 'closed']);
export type TradeStatus = z.infer<typeof tradeStatusEnum>;

// Trade type enum
export const tradeTypeEnum = z.enum(['buy', 'sell']);
export type TradeType = z.infer<typeof tradeTypeEnum>;

// Asset type enum
export const assetTypeEnum = z.enum(['crypto', 'stock', 'forex']);
export type AssetType = z.infer<typeof assetTypeEnum>;

// Trade schema
export const tradeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  symbol: z.string(),
  asset_type: assetTypeEnum,
  trade_type: tradeTypeEnum,
  quantity: z.number(),
  entry_price: z.number(),
  exit_price: z.number().nullable(),
  status: tradeStatusEnum,
  profit_loss: z.number().nullable(),
  created_at: z.coerce.date(),
  closed_at: z.coerce.date().nullable()
});

export type Trade = z.infer<typeof tradeSchema>;

// Input schema for creating trades
export const createTradeInputSchema = z.object({
  user_id: z.number(),
  symbol: z.string(),
  asset_type: assetTypeEnum,
  trade_type: tradeTypeEnum,
  quantity: z.number().positive(),
  entry_price: z.number().positive()
});

export type CreateTradeInput = z.infer<typeof createTradeInputSchema>;

// Input schema for closing trades
export const closeTradeInputSchema = z.object({
  id: z.number(),
  exit_price: z.number().positive()
});

export type CloseTradeInput = z.infer<typeof closeTradeInputSchema>;

// Trader schema for copy trading
export const traderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  display_name: z.string(),
  bio: z.string().nullable(),
  total_followers: z.number(),
  profit_percentage: z.number(),
  win_rate: z.number(),
  total_trades: z.number(),
  subscription_price: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Trader = z.infer<typeof traderSchema>;

// Input schema for creating trader profile
export const createTraderInputSchema = z.object({
  user_id: z.number(),
  display_name: z.string().min(1).max(100),
  bio: z.string().nullable().optional(),
  subscription_price: z.number().nonnegative()
});

export type CreateTraderInput = z.infer<typeof createTraderInputSchema>;

// Subscription schema
export const subscriptionSchema = z.object({
  id: z.number(),
  subscriber_id: z.number(),
  trader_id: z.number(),
  status: z.enum(['active', 'expired', 'cancelled']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  price_paid: z.number(),
  created_at: z.coerce.date()
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// Input schema for creating subscription
export const createSubscriptionInputSchema = z.object({
  subscriber_id: z.number(),
  trader_id: z.number(),
  price_paid: z.number().positive()
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;

// Signal schema
export const signalSchema = z.object({
  id: z.number(),
  trader_id: z.number(),
  symbol: z.string(),
  asset_type: assetTypeEnum,
  signal_type: tradeTypeEnum,
  entry_price: z.number(),
  stop_loss: z.number().nullable(),
  take_profit: z.number().nullable(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  expires_at: z.coerce.date().nullable()
});

export type Signal = z.infer<typeof signalSchema>;

// Input schema for creating signals
export const createSignalInputSchema = z.object({
  trader_id: z.number(),
  symbol: z.string(),
  asset_type: assetTypeEnum,
  signal_type: tradeTypeEnum,
  entry_price: z.number().positive(),
  stop_loss: z.number().positive().optional(),
  take_profit: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  expires_at: z.coerce.date().nullable().optional()
});

export type CreateSignalInput = z.infer<typeof createSignalInputSchema>;

// Transaction type enum
export const transactionTypeEnum = z.enum(['deposit', 'withdrawal', 'trade', 'subscription', 'fund_wallet']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

// Transaction status enum
export const transactionStatusEnum = z.enum(['pending', 'completed', 'failed', 'cancelled']);
export type TransactionStatus = z.infer<typeof transactionStatusEnum>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: transactionTypeEnum,
  amount: z.number(),
  currency: z.string(),
  status: transactionStatusEnum,
  description: z.string().nullable(),
  reference_id: z.string().nullable(),
  created_at: z.coerce.date(),
  processed_at: z.coerce.date().nullable()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  type: transactionTypeEnum,
  amount: z.number(),
  currency: z.string(),
  description: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Educational content schema
export const educationalContentSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  video_url: z.string(),
  thumbnail_url: z.string().nullable(),
  duration: z.number().nullable(),
  category: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  is_featured: z.boolean(),
  view_count: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type EducationalContent = z.infer<typeof educationalContentSchema>;

// Input schema for creating educational content
export const createEducationalContentInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  video_url: z.string().url(),
  thumbnail_url: z.string().url().nullable().optional(),
  duration: z.number().positive().optional(),
  category: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced'])
});

export type CreateEducationalContentInput = z.infer<typeof createEducationalContentInputSchema>;

// Price feed schema for real-time data simulation
export const priceFeedSchema = z.object({
  id: z.number(),
  symbol: z.string(),
  asset_type: assetTypeEnum,
  current_price: z.number(),
  price_change_24h: z.number(),
  price_change_percentage_24h: z.number(),
  volume_24h: z.number(),
  market_cap: z.number().nullable(),
  last_updated: z.coerce.date()
});

export type PriceFeed = z.infer<typeof priceFeedSchema>;

// Input schema for updating price feeds
export const updatePriceFeedInputSchema = z.object({
  symbol: z.string(),
  current_price: z.number().positive(),
  price_change_24h: z.number(),
  price_change_percentage_24h: z.number(),
  volume_24h: z.number().nonnegative(),
  market_cap: z.number().nullable().optional()
});

export type UpdatePriceFeedInput = z.infer<typeof updatePriceFeedInputSchema>;

// Copy trade schema for tracking copied trades
export const copyTradeSchema = z.object({
  id: z.number(),
  subscriber_id: z.number(),
  trader_id: z.number(),
  signal_id: z.number(),
  original_trade_id: z.number().nullable(),
  copied_trade_id: z.number().nullable(),
  status: z.enum(['pending', 'executed', 'failed']),
  created_at: z.coerce.date(),
  executed_at: z.coerce.date().nullable()
});

export type CopyTrade = z.infer<typeof copyTradeSchema>;

// Input schema for copying trades
export const copyTradeInputSchema = z.object({
  subscriber_id: z.number(),
  trader_id: z.number(),
  signal_id: z.number()
});

export type CopyTradeInput = z.infer<typeof copyTradeInputSchema>;

// Wallet schema for fund management
export const walletSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  currency: z.string(),
  balance: z.number(),
  available_balance: z.number(),
  locked_balance: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Wallet = z.infer<typeof walletSchema>;

// Input schema for wallet operations
export const fundWalletInputSchema = z.object({
  user_id: z.number(),
  currency: z.string(),
  amount: z.number().positive(),
  external_reference: z.string().nullable().optional()
});

export type FundWalletInput = z.infer<typeof fundWalletInputSchema>;