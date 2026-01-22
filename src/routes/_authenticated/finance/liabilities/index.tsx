import { createFileRoute } from '@tanstack/react-router'
import { Liabilities } from '@/features/finance/liabilities'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedLiabilities = withPageGuard(Liabilities, BeeAdminModules.FINANCE_LIABILITIES)

export const Route = createFileRoute(
  '/_authenticated/finance/liabilities/' as any
)({
  component: ProtectedLiabilities,
})
