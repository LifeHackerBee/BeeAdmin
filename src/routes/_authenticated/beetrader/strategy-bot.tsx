import { createFileRoute } from '@tanstack/react-router'
import { StrategyBot } from '@/features/beetrader/strategy-bot'

export const Route = createFileRoute('/_authenticated/beetrader/strategy-bot')({
  component: StrategyBot,
})
