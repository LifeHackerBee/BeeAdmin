import { createFileRoute } from '@tanstack/react-router'
import { ExchangeRate } from '@/features/finance'

export const Route = createFileRoute('/_authenticated/finance/exchange-rate/' as any)({
  component: ExchangeRate,
})

