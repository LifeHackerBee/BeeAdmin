import { z } from 'zod'

export type KolOutcome = 'win' | 'loss' | 'breakeven'
export type KolDirection = 'long' | 'short'

export type KolPerformanceRecord = {
  id: number
  user_id: string | null
  date: string
  kol_name: string
  coin: string | null
  direction: KolDirection | null
  entry_price: number | null
  exit_price: number | null
  outcome: KolOutcome
  pnl_pct: number | null
  note: string | null
  created_at?: string
  updated_at?: string
}

export const kolEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 YYYY-MM-DD'),
  kol_name: z.string().min(1, 'KOL 名称必填'),
  coin: z.string().optional().nullable(),
  direction: z.enum(['long', 'short']).optional().nullable(),
  entry_price: z.number().nullable().optional(),
  exit_price: z.number().nullable().optional(),
  outcome: z.enum(['win', 'loss', 'breakeven']),
  pnl_pct: z.number().nullable().optional(),
  note: z.string().optional().nullable(),
})

export type KolEntryInput = z.infer<typeof kolEntrySchema>

export type KolStats = {
  kol_name: string
  total: number
  win: number
  loss: number
  breakeven: number
  win_rate: number
  avg_pnl_pct: number | null
}

export type KolDailyPoint = {
  date: string
  win_rate: number
  total: number
}
