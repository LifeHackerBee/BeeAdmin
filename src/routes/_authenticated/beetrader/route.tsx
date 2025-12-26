import { createFileRoute } from '@tanstack/react-router'
import { BeeTrader } from '@/features/beetrader'

export const Route = createFileRoute('/_authenticated/beetrader')({
  component: BeeTrader,
})

