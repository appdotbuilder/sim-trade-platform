import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createTradeInputSchema,
  closeTradeInputSchema,
  createTraderInputSchema,
  createSubscriptionInputSchema,
  createSignalInputSchema,
  copyTradeInputSchema,
  updatePriceFeedInputSchema,
  createTransactionInputSchema,
  createEducationalContentInputSchema,
  fundWalletInputSchema,
  type TransactionType
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUser, getUserByEmail } from './handlers/get_user';
import { updateUser, verifyUser } from './handlers/update_user';
import { createTrade } from './handlers/create_trade';
import { getUserTrades, getTradeHistory, getActiveTrades } from './handlers/get_trades';
import { closeTrade } from './handlers/close_trade';
import { getAvailableTraders, getTraderById, getTopTraders } from './handlers/get_traders';
import { createTrader } from './handlers/create_trader';
import { createSubscription } from './handlers/create_subscription';
import { getUserSubscriptions, getActiveSubscriptions, cancelSubscription } from './handlers/get_subscriptions';
import { createSignal } from './handlers/create_signal';
import { getUserSignals, getActiveSignals, getTraderSignals } from './handlers/get_signals';
import { copyTrade, getCopyTradeHistory } from './handlers/copy_trade';
import { getPriceFeeds, getPriceFeedBySymbol, getPriceFeedsByAssetType } from './handlers/get_price_feeds';
import { updatePriceFeed } from './handlers/update_price_feed';
import { createTransaction } from './handlers/create_transaction';
import { getUserTransactions, getTransactionsByType, getDeposits, getWithdrawals } from './handlers/get_transactions';
import { getEducationalContent, getFeaturedContent, getContentByCategory, getContentByLevel } from './handlers/get_educational_content';
import { createEducationalContent } from './handlers/create_educational_content';
import { fundWallet } from './handlers/fund_wallet';
import { getUserWallets, getWalletByCurrency } from './handlers/get_wallets';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User Management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUser: publicProcedure
    .input(z.number())
    .query(({ input }) => getUser(input)),

  getUserByEmail: publicProcedure
    .input(z.string().email())
    .query(({ input }) => getUserByEmail(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  verifyUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => verifyUser(input)),

  // Trading
  createTrade: publicProcedure
    .input(createTradeInputSchema)
    .mutation(({ input }) => createTrade(input)),

  getUserTrades: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserTrades(input)),

  getTradeHistory: publicProcedure
    .input(z.object({ userId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => getTradeHistory(input.userId, input.limit)),

  getActiveTrades: publicProcedure
    .input(z.number())
    .query(({ input }) => getActiveTrades(input)),

  closeTrade: publicProcedure
    .input(closeTradeInputSchema)
    .mutation(({ input }) => closeTrade(input)),

  // Copy Trading - Traders
  getAvailableTraders: publicProcedure
    .query(() => getAvailableTraders()),

  getTraderById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTraderById(input)),

  getTopTraders: publicProcedure
    .input(z.number().optional().default(10))
    .query(({ input }) => getTopTraders(input)),

  createTrader: publicProcedure
    .input(createTraderInputSchema)
    .mutation(({ input }) => createTrader(input)),

  // Subscriptions
  createSubscription: publicProcedure
    .input(createSubscriptionInputSchema)
    .mutation(({ input }) => createSubscription(input)),

  getUserSubscriptions: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserSubscriptions(input)),

  getActiveSubscriptions: publicProcedure
    .input(z.number())
    .query(({ input }) => getActiveSubscriptions(input)),

  cancelSubscription: publicProcedure
    .input(z.number())
    .mutation(({ input }) => cancelSubscription(input)),

  // Signals
  createSignal: publicProcedure
    .input(createSignalInputSchema)
    .mutation(({ input }) => createSignal(input)),

  getUserSignals: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserSignals(input)),

  getActiveSignals: publicProcedure
    .input(z.number())
    .query(({ input }) => getActiveSignals(input)),

  getTraderSignals: publicProcedure
    .input(z.number())
    .query(({ input }) => getTraderSignals(input)),

  // Copy Trading
  copyTrade: publicProcedure
    .input(copyTradeInputSchema)
    .mutation(({ input }) => copyTrade(input)),

  getCopyTradeHistory: publicProcedure
    .input(z.number())
    .query(({ input }) => getCopyTradeHistory(input)),

  // Price Feeds
  getPriceFeeds: publicProcedure
    .query(() => getPriceFeeds()),

  getPriceFeedBySymbol: publicProcedure
    .input(z.string())
    .query(({ input }) => getPriceFeedBySymbol(input)),

  getPriceFeedsByAssetType: publicProcedure
    .input(z.enum(['crypto', 'stock', 'forex']))
    .query(({ input }) => getPriceFeedsByAssetType(input)),

  updatePriceFeed: publicProcedure
    .input(updatePriceFeedInputSchema)
    .mutation(({ input }) => updatePriceFeed(input)),

  // Transactions
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getUserTransactions: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserTransactions(input)),

  getTransactionsByType: publicProcedure
    .input(z.object({ userId: z.number(), type: z.enum(['deposit', 'withdrawal', 'trade', 'subscription', 'fund_wallet']) }))
    .query(({ input }) => getTransactionsByType(input.userId, input.type as TransactionType)),

  getDeposits: publicProcedure
    .input(z.number())
    .query(({ input }) => getDeposits(input)),

  getWithdrawals: publicProcedure
    .input(z.number())
    .query(({ input }) => getWithdrawals(input)),

  // Educational Content
  getEducationalContent: publicProcedure
    .query(() => getEducationalContent()),

  getFeaturedContent: publicProcedure
    .query(() => getFeaturedContent()),

  getContentByCategory: publicProcedure
    .input(z.string())
    .query(({ input }) => getContentByCategory(input)),

  getContentByLevel: publicProcedure
    .input(z.enum(['beginner', 'intermediate', 'advanced']))
    .query(({ input }) => getContentByLevel(input)),

  createEducationalContent: publicProcedure
    .input(createEducationalContentInputSchema)
    .mutation(({ input }) => createEducationalContent(input)),

  // Wallet Management
  fundWallet: publicProcedure
    .input(fundWalletInputSchema)
    .mutation(({ input }) => fundWallet(input)),

  getUserWallets: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserWallets(input)),

  getWalletByCurrency: publicProcedure
    .input(z.object({ userId: z.number(), currency: z.string() }))
    .query(({ input }) => getWalletByCurrency(input.userId, input.currency)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🚀 Crypto Trading Platform TRPC server listening at port: ${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`  - User Management: createUser, getUser, updateUser, verifyUser`);
  console.log(`  - Trading: createTrade, getUserTrades, getTradeHistory, closeTrade`);
  console.log(`  - Copy Trading: getAvailableTraders, createTrader, copyTrade`);
  console.log(`  - Subscriptions: createSubscription, getUserSubscriptions, cancelSubscription`);
  console.log(`  - Signals: createSignal, getUserSignals, getActiveSignals`);
  console.log(`  - Price Feeds: getPriceFeeds, updatePriceFeed`);
  console.log(`  - Transactions: createTransaction, getUserTransactions, getDeposits, getWithdrawals`);
  console.log(`  - Education: getEducationalContent, createEducationalContent`);
  console.log(`  - Wallets: fundWallet, getUserWallets`);
}

start();