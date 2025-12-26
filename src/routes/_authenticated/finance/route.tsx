import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/finance' as any)({
  component: () => <Outlet />,
})

