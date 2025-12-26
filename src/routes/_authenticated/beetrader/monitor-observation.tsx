import { createFileRoute } from '@tanstack/react-router'
import { WhaleObservation } from '@/features/beetrader/monitor/observation'

export const Route = createFileRoute('/_authenticated/beetrader/monitor-observation' as any)({
  component: WhaleObservation,
})

