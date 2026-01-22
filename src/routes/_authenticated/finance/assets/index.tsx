import { createFileRoute } from '@tanstack/react-router'
import { Assets } from '@/features/finance/assets'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedAssets = withPageGuard(Assets, BeeAdminModules.FINANCE_ASSETS)

export const Route = createFileRoute(
  '/_authenticated/finance/assets/' as any
)({
  component: ProtectedAssets,
})
