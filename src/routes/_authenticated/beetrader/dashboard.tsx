import { createFileRoute } from '@tanstack/react-router'
import { BeeTraderDashboard } from '@/features/beetrader/dashboard'

export const Route = createFileRoute(
  '/_authenticated/beetrader/dashboard' as any
)({
  component: BeeTraderDashboard,
})
