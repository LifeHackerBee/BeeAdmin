import { createFileRoute } from '@tanstack/react-router'
import { Assets } from '@/features/finance/assets'

export const Route = createFileRoute(
  '/_authenticated/finance/assets/' as any
)({
  component: Assets,
})
