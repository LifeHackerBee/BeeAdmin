import { createFileRoute } from '@tanstack/react-router'
import { TradingSignals } from '@/features/beetrader/signals'

export const Route = createFileRoute('/_authenticated/beetrader/signals')({
  component: TradingSignals,
})

