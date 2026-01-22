import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { WhaleManagement } from '@/features/beetrader/whale-management'

const monitorSearchSchema = z.object({
  tab: z.enum(['wallets', 'tracker', 'events']).optional().catch('wallets'),
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  filter: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/beetrader/whale-wallet-manage' as any)({
  validateSearch: monitorSearchSchema,
  component: WhaleManagement,
})

