import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/beetrader/')({
  beforeLoad: () => {
    throw redirect({
      to: '/beetrader/whale-wallet-manage' as any,
    })
  },
})

