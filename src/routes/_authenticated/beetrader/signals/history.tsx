import { createFileRoute } from '@tanstack/react-router'
import { AnalysisHistoryTab } from '@/features/beetrader/signals/components/analysis-history-tab'

export const Route = createFileRoute('/_authenticated/beetrader/signals/history' as any)({
  component: AnalysisHistoryTab,
})
