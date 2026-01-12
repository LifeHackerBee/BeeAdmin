import { createFileRoute } from '@tanstack/react-router'
import { Liabilities } from '@/features/finance/liabilities'

export const Route = createFileRoute(
  '/_authenticated/finance/liabilities/' as any
)({
  component: Liabilities,
})
