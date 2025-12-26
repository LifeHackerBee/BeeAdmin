import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Monitor } from '@/features/beetrader/monitor'

const monitorSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  filter: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/beetrader/monitor')({
  validateSearch: monitorSearchSchema,
  component: Monitor,
})

