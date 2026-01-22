import { createFileRoute } from '@tanstack/react-router'
import { Investment } from '@/features/finance'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedInvestment = withPageGuard(Investment, BeeAdminModules.FINANCE_INVESTMENT)

export const Route = createFileRoute('/_authenticated/finance/investment/' as any)({
  component: ProtectedInvestment,
})
