import { useQuery } from '@tanstack/react-query'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'
import { type Expense, expenseSchema } from '../data/schema'

type ExpenseRow = {
  id: number
  created_at?: string | null
  device_name: string | null
  spending_time: string
  category: string
  amount: number | string | null
  currency: string | null
  note: string | null
}

export function useExpenses() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['expenses'],
    enabled: !loading && !!user, // 只有在已登录且不在加载状态时才执行查询
    queryFn: async () => {
      const data = await hyperliquidApiGet<ExpenseRow[]>('/api/finance/expenses')

      // 转换数据格式，确保类型正确
      const expenses: Expense[] = (data || []).map((row) => {
        let amount: number | null = null
        if (row.amount !== null && row.amount !== undefined) {
          const amountValue = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount
          if (!isNaN(amountValue)) {
            amount = amountValue
          }
        }

        return {
          id: row.id,
          created_at: row.created_at || undefined,
          device_name: row.device_name,
          spending_time: row.spending_time,
          category: row.category,
          amount,
          currency: row.currency,
          note: row.note,
        }
      })

      return expenses.map((expense) => {
        const result = expenseSchema.safeParse(expense)
        if (result.success) {
          return result.data
        } else {
          console.warn('Expense validation failed:', result.error, expense)
          return {
            id: expense.id,
            created_at: expense.created_at,
            device_name: expense.device_name,
            spending_time: expense.spending_time || new Date().toISOString(),
            category: expense.category || 'Others',
            amount: expense.amount ?? 0,
            currency: expense.currency || 'CNY',
            note: expense.note,
          }
        }
      })
    },
  })
}
