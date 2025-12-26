import { createFileRoute } from '@tanstack/react-router'
import { Monitor } from '@/features/beetrader/monitor'

export const Route = createFileRoute('/_authenticated/beetrader/')({
  component: Monitor,
})

