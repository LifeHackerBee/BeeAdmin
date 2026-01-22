import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/beetrader/events' as any)({
  beforeLoad: () => {
    throw redirect({
      to: '/beetrader/whale-wallet-manage',
      search: { tab: 'events' },
    } as any)
  },
})
