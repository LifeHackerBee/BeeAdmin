import { createFileRoute } from '@tanstack/react-router'
import { BeeAI } from '@/features/beeai'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedBeeAI = withPageGuard(BeeAI, BeeAdminModules.BEEAI)

export const Route = createFileRoute('/_authenticated/beeai/')({
  component: ProtectedBeeAI,
})

