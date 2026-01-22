import { createFileRoute } from '@tanstack/react-router'
import { Statistics } from '@/features/finance'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedStatistics = withPageGuard(Statistics, BeeAdminModules.FINANCE_STATISTICS)

export const Route = createFileRoute('/_authenticated/finance/statistics/' as any)({
  component: ProtectedStatistics,
})

