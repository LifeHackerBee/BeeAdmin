import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TradingSignals } from '@/features/beetrader/signals'

const signalsSearchSchema = z.object({
  tab: z.enum(['market', 'radar', 'jobs']).optional().catch('radar'),
})

export const Route = createFileRoute('/_authenticated/beetrader/signals')({
  validateSearch: signalsSearchSchema,
  component: TradingSignals,
})
