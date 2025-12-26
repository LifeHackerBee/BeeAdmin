import { createFileRoute } from '@tanstack/react-router'
import { BacktestModule } from '@/features/beetrader/backtest'

export const Route = createFileRoute('/_authenticated/beetrader/backtest')({
  component: BacktestModule,
})

