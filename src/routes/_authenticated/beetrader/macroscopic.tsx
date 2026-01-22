import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/beetrader/macroscopic' as any)({
  beforeLoad: () => {
    throw redirect({
      to: '/beetrader/market' as any,
    })
  },
})

