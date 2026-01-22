import { createFileRoute } from '@tanstack/react-router'
import { ExchangeRate } from '@/features/finance'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const ProtectedExchangeRate = withPageGuard(ExchangeRate, BeeAdminModules.FINANCE_EXCHANGE_RATE)

export const Route = createFileRoute('/_authenticated/finance/exchange-rate/' as any)({
  component: ProtectedExchangeRate,
})

