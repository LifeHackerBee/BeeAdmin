import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/beetrader/')({
  beforeLoad: () => {
    throw redirect({
      to: '/beetrader/dashboard' as any,
    })
  },
})

