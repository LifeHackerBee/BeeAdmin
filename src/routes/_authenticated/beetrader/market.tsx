import { createFileRoute } from '@tanstack/react-router'
import { Market } from '@/features/beetrader/market'

export const Route = createFileRoute('/_authenticated/beetrader/market' as any)({
  component: Market,
})
