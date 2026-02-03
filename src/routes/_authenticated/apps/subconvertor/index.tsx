import { createFileRoute } from '@tanstack/react-router'
import { Subconvertor } from '@/features/subconvertor'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedSubconvertor = withPageGuard(Subconvertor, BeeAdminModules.SUBCONVERTOR)

export const Route = createFileRoute('/_authenticated/apps/subconvertor/' as any)({
  component: ProtectedSubconvertor,
})
