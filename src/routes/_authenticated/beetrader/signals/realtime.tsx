import { createFileRoute } from '@tanstack/react-router'
import { UnifiedAnalysis } from '@/features/beetrader/signals/components/unified-analysis'

export const Route = createFileRoute('/_authenticated/beetrader/signals/realtime' as any)({
  component: UnifiedAnalysis,
})
