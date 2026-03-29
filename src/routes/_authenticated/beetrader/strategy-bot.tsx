import { createFileRoute } from '@tanstack/react-router'
import { StrategyBotPage } from '@/features/beetrader/strategy-bot'

export const Route = createFileRoute('/_authenticated/beetrader/strategy-bot')({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as 'paper' | 'live') || 'paper',
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { mode } = Route.useSearch()
  return <StrategyBotPage mode={mode} />
}
