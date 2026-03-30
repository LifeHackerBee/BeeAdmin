import { createFileRoute } from '@tanstack/react-router'
import { ScheduledAnalysisTab } from '@/features/beetrader/signals/components/scheduled-analysis-tab'

export const Route = createFileRoute('/_authenticated/beetrader/signals/scheduled' as any)({
  component: ScheduledAnalysisTab,
})
