import { createFileRoute } from '@tanstack/react-router'
import { Categories } from '@/features/finance/expenses/components/categories'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedCategories = withPageGuard(Categories, BeeAdminModules.FINANCE_CATEGORIES)

export const Route = createFileRoute('/_authenticated/finance/categories/' as any)({
  component: ProtectedCategories,
})

