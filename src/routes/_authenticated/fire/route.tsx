import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/fire' as any)({
  component: () => <Outlet />,
})
