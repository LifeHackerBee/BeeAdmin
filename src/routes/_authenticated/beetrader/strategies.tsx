import { createFileRoute } from '@tanstack/react-router'
import { TradingStrategies } from '@/features/beetrader/strategies'

export const Route = createFileRoute('/_authenticated/beetrader/strategies')({
  component: TradingStrategies,
})

