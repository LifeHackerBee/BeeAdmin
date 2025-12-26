import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { type Expense, expenseSchema } from '../data/schema'

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('spending_time', { ascending: false })

      if (error) {
        throw error
      }

      // 转换数据格式，确保类型正确
      const expenses: Expense[] = (data || []).map((row) => {
        // 处理 amount：可能是 string (numeric) 或 number
        let amount: number | null = null
        if (row.amount !== null && row.amount !== undefined) {
          const amountValue = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount
          // 如果解析失败，设为 null
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

      // 验证数据（使用 safeParse 避免抛出错误）
      return expenses.map((expense) => {
        const result = expenseSchema.safeParse(expense)
        if (result.success) {
          return result.data
        } else {
          // 如果验证失败，记录错误但返回原始数据（或提供默认值）
          console.warn('Expense validation failed:', result.error, expense)
          // 返回带默认值的数据
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

