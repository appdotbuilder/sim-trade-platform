import { z } from 'zod';

// Asset schema for trading assets
export const assetSchema = z.object({
  id: z.number(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Asset = z.infer<typeof assetSchema>;

// Input schema for creating assets
export const createAssetInputSchema = z.object({
  symbol: z.string().min(1).max(10),
  name: z.string().min(1),
  current_price: z.number().positive()
});

export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

// Input schema for updating assets
export const updateAssetInputSchema = z.object({
  id: z.number(),
  symbol: z.string().min(1).max(10).optional(),
  name: z.string().min(1).optional(),
  current_price: z.number().positive().optional()
});

export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;

// Copy trader schema
export const copyTraderSchema = z.object({
  id: z.number(),
  name: z.string(),
  trades_won: z.number().int(),
  trades_lost: z.number().int(),
  followers: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CopyTrader = z.infer<typeof copyTraderSchema>;

// Input schema for creating copy traders
export const createCopyTraderInputSchema = z.object({
  name: z.string().min(1),
  trades_won: z.number().int().nonnegative(),
  trades_lost: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative()
});

export type CreateCopyTraderInput = z.infer<typeof createCopyTraderInputSchema>;

// Input schema for updating copy traders
export const updateCopyTraderInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  trades_won: z.number().int().nonnegative().optional(),
  trades_lost: z.number().int().nonnegative().optional(),
  followers: z.number().int().nonnegative().optional()
});

export type UpdateCopyTraderInput = z.infer<typeof updateCopyTraderInputSchema>;

// Signal schema
export const signalSchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  signal_type: z.enum(['BUY', 'SELL']),
  target_price: z.number(),
  quantity: z.number(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Signal = z.infer<typeof signalSchema>;

// Input schema for creating signals
export const createSignalInputSchema = z.object({
  asset_id: z.number(),
  signal_type: z.enum(['BUY', 'SELL']),
  target_price: z.number().positive(),
  quantity: z.number().positive(),
  description: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export type CreateSignalInput = z.infer<typeof createSignalInputSchema>;

// Input schema for updating signals
export const updateSignalInputSchema = z.object({
  id: z.number(),
  asset_id: z.number().optional(),
  signal_type: z.enum(['BUY', 'SELL']).optional(),
  target_price: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateSignalInput = z.infer<typeof updateSignalInputSchema>;

// Trading simulation schema
export const simulatedTradeSchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  trade_type: z.enum(['BUY', 'SELL']),
  quantity: z.number(),
  price: z.number(),
  executed_at: z.coerce.date()
});

export type SimulatedTrade = z.infer<typeof simulatedTradeSchema>;

// Input schema for executing simulated trades
export const executeTradeInputSchema = z.object({
  asset_id: z.number(),
  trade_type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive()
});

export type ExecuteTradeInput = z.infer<typeof executeTradeInputSchema>;

// Enhanced signal with asset information for display
export const signalWithAssetSchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  signal_type: z.enum(['BUY', 'SELL']),
  target_price: z.number(),
  quantity: z.number(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  asset: assetSchema
});

export type SignalWithAsset = z.infer<typeof signalWithAssetSchema>;

// Delete input schemas
export const deleteByIdInputSchema = z.object({
  id: z.number()
});

export type DeleteByIdInput = z.infer<typeof deleteByIdInputSchema>;