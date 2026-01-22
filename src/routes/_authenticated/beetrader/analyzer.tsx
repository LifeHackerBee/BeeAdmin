import { createFileRoute } from '@tanstack/react-router'
import { TraderAnalyzer } from '@/features/beetrader/analyzer'

export const Route = createFileRoute('/_authenticated/beetrader/analyzer' as any)({
  component: TraderAnalyzer,
})
