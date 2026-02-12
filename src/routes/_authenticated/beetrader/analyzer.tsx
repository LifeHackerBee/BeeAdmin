import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { TraderAnalyzer } from '@/features/beetrader/analyzer'

const analyzerSearchSchema = z.object({
  address: z.string().optional(),
  autoAnalyze: z.union([z.literal('1'), z.boolean()]).optional(),
})

export const Route = createFileRoute('/_authenticated/beetrader/analyzer' as any)({
  validateSearch: analyzerSearchSchema,
  component: TraderAnalyzer,
})
