import { createFileRoute } from '@tanstack/react-router'
import { Categories } from '@/features/finance/expenses/components/categories'

export const Route = createFileRoute('/_authenticated/finance/categories/' as any)({
  component: Categories,
})

