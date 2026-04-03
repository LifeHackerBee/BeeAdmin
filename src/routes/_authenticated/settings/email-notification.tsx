import { createFileRoute } from '@tanstack/react-router'
import { EmailNotification } from '@/features/settings/email-notification'

export const Route = createFileRoute(
  '/_authenticated/settings/email-notification'
)({
  component: EmailNotification,
})
