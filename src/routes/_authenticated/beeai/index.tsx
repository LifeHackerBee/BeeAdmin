import { createFileRoute } from '@tanstack/react-router'
import { BeeAI } from '@/features/beeai'

export const Route = createFileRoute('/_authenticated/beeai/')({
  component: BeeAI,
})

