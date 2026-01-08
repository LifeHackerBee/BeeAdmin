import { createFileRoute } from '@tanstack/react-router'
import { Fire } from '@/features/fire'

export const Route = createFileRoute('/_authenticated/fire/' as any)({
  component: Fire,
})
