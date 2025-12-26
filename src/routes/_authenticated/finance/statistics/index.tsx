import { createFileRoute } from '@tanstack/react-router'
import { Statistics } from '@/features/finance'

export const Route = createFileRoute('/_authenticated/finance/statistics/' as any)({
  component: Statistics,
})

