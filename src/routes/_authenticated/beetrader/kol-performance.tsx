import { createFileRoute } from '@tanstack/react-router'
import { KolPerformancePage } from '@/features/beetrader/kol-performance'

export const Route = createFileRoute('/_authenticated/beetrader/kol-performance' as any)({
  component: KolPerformancePage,
})
