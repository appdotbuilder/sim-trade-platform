import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createAssetInputSchema,
  updateAssetInputSchema,
  deleteByIdInputSchema,
  createCopyTraderInputSchema,
  updateCopyTraderInputSchema,
  createSignalInputSchema,
  updateSignalInputSchema,
  executeTradeInputSchema
} from './schema';

// Import handlers
import { createAsset } from './handlers/create_asset';
import { getAssets } from './handlers/get_assets';
import { updateAsset } from './handlers/update_asset';
import { deleteAsset } from './handlers/delete_asset';
import { createCopyTrader } from './handlers/create_copy_trader';
import { getCopyTraders } from './handlers/get_copy_traders';
import { updateCopyTrader } from './handlers/update_copy_trader';
import { deleteCopyTrader } from './handlers/delete_copy_trader';
import { createSignal } from './handlers/create_signal';
import { getSignals } from './handlers/get_signals';
import { getActiveSignals } from './handlers/get_active_signals';
import { updateSignal } from './handlers/update_signal';
import { deleteSignal } from './handlers/delete_signal';
import { executeTrade } from './handlers/execute_trade';
import { getSimulatedTrades } from './handlers/get_simulated_trades';
import { seedInitialData } from './handlers/seed_initial_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Asset management endpoints
  createAsset: publicProcedure
    .input(createAssetInputSchema)
    .mutation(({ input }) => createAsset(input)),
  
  getAssets: publicProcedure
    .query(() => getAssets()),
  
  updateAsset: publicProcedure
    .input(updateAssetInputSchema)
    .mutation(({ input }) => updateAsset(input)),
  
  deleteAsset: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteAsset(input)),

  // Copy trader management endpoints
  createCopyTrader: publicProcedure
    .input(createCopyTraderInputSchema)
    .mutation(({ input }) => createCopyTrader(input)),
  
  getCopyTraders: publicProcedure
    .query(() => getCopyTraders()),
  
  updateCopyTrader: publicProcedure
    .input(updateCopyTraderInputSchema)
    .mutation(({ input }) => updateCopyTrader(input)),
  
  deleteCopyTrader: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteCopyTrader(input)),

  // Signal management endpoints
  createSignal: publicProcedure
    .input(createSignalInputSchema)
    .mutation(({ input }) => createSignal(input)),
  
  getSignals: publicProcedure
    .query(() => getSignals()),
  
  getActiveSignals: publicProcedure
    .query(() => getActiveSignals()),
  
  updateSignal: publicProcedure
    .input(updateSignalInputSchema)
    .mutation(({ input }) => updateSignal(input)),
  
  deleteSignal: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteSignal(input)),

  // Trading simulation endpoints
  executeTrade: publicProcedure
    .input(executeTradeInputSchema)
    .mutation(({ input }) => executeTrade(input)),
  
  getSimulatedTrades: publicProcedure
    .query(() => getSimulatedTrades()),

  // Data seeding endpoint for initial setup
  seedInitialData: publicProcedure
    .mutation(() => seedInitialData()),
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
  console.log(`TRPC server listening at port: ${port}`);
}

start();