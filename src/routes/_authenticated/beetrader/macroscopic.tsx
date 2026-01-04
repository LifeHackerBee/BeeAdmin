import { createFileRoute } from '@tanstack/react-router'
import { Macroscopic } from '@/features/beetrader/macroscopic'

export const Route = createFileRoute('/_authenticated/beetrader/macroscopic' as any)({
  component: Macroscopic,
})

