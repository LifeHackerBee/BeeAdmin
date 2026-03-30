import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/beetrader/signals/' as any)({
  beforeLoad: () => {
    throw redirect({ to: '/beetrader/signals/realtime' as any })
  },
})
