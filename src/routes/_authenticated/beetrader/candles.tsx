import { createFileRoute } from '@tanstack/react-router'
import { Candles } from '@/features/beetrader/candles'

export const Route = createFileRoute('/_authenticated/beetrader/candles' as any)({
  component: Candles,
})

