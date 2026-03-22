import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/beetrader/market' as any)({
  beforeLoad: () => {
    throw redirect({
      to: '/beetrader/signals' as any,
      search: {} as any,
    })
  },
})
