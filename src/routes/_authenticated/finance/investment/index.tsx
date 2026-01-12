import { createFileRoute } from '@tanstack/react-router'
import { Investment } from '@/features/finance'

export const Route = createFileRoute('/_authenticated/finance/investment/' as any)({
  component: Investment,
})
