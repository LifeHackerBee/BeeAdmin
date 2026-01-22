import { createFileRoute } from '@tanstack/react-router'
import { Fire } from '@/features/fire'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedFire = withPageGuard(Fire, BeeAdminModules.FIRE)

export const Route = createFileRoute('/_authenticated/fire/' as any)({
  component: ProtectedFire,
})
