import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Expenses } from '@/features/finance'
import { currencies } from '@/features/finance/expenses/data/data'
import { withPageGuard } from '@/components/rbac/page-guard'
import { BeeAdminModules } from '@/lib/rbac'

// 使用动态验证：允许任何字符串，在组件层面进行验证
const expensesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  category: z.array(z.string()).optional().catch([]),
  currency: z
    .array(z.enum(currencies.map((c) => c.value) as [string, ...string[]]))
    .optional()
    .catch([]),
  filter: z.string().optional().catch(''),
})

const ProtectedExpenses = withPageGuard(Expenses, BeeAdminModules.FINANCE_EXPENSES)

export const Route = createFileRoute('/_authenticated/finance/expenses/' as any)({
  validateSearch: expensesSearchSchema,
  component: ProtectedExpenses,
})

