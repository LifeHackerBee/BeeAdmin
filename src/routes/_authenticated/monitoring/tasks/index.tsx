import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Tasks } from '@/features/monitoring/tasks'
import { statuses } from '@/features/monitoring/tasks/data/data'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

const taskSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(z.enum(statuses.map((status) => status.value)))
    .optional()
    .catch([]),
  filter: z.string().optional().catch(''),
})

const ProtectedTasks = withPageGuard(Tasks, BeeAdminModules.MONITORING_TASKS)

export const Route = createFileRoute('/_authenticated/monitoring/tasks/')({
  validateSearch: taskSearchSchema,
  component: ProtectedTasks,
})

