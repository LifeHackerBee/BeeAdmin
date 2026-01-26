import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { type Liability, liabilitySchema } from '../data/schema'

export function useLiabilities() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  
  return useQuery({
    queryKey: ['liabilities'],
    enabled: !loading && !!user, // 只有在已登录且不在加载状态时才执行查询
    queryFn: async () => {
      // 使用 liability_details 视图获取完整信息
      const { data, error } = await supabase
        .from('liability_details')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // 转换数据格式，确保类型正确
      const liabilities: Liability[] = (data || []).map((row) => {
        // 处理 numeric 字段：可能是 string 或 number
        const parseNumeric = (value: number | string | null | undefined): number => {
          if (value === null || value === undefined) return 0
          return typeof value === 'string' ? parseFloat(value) : value
        }

        return {
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          type: row.type as Liability['type'],
          total_amount: parseNumeric(row.total_amount),
          initial_principal: parseNumeric(row.initial_principal),
          paid_amount: parseNumeric(row.paid_amount),
          remaining_principal: parseNumeric(row.remaining_principal),
          total_periods: row.total_periods,
          remaining_periods: row.remaining_periods,
          start_date: row.start_date,
          first_payment_date: row.first_payment_date,
          last_payment_date: row.last_payment_date || undefined,
          monthly_payment: row.monthly_payment ? parseNumeric(row.monthly_payment) : undefined,
          payment_method: row.payment_method as Liability['payment_method'],
          payment_day: row.payment_day,
          current_annual_rate: parseNumeric(row.current_annual_rate),
          current_rate_effective_date: row.current_rate_effective_date,
          currency: row.currency || 'CNY',
          status: row.status as Liability['status'],
          note: row.note,
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
          // 视图字段
          avg_annual_rate: row.avg_annual_rate ? parseNumeric(row.avg_annual_rate) : undefined,
          calculated_remaining_principal: row.calculated_remaining_principal
            ? parseNumeric(row.calculated_remaining_principal)
            : undefined,
          paid_periods: row.paid_periods,
          calculated_monthly_payment: row.calculated_monthly_payment
            ? parseNumeric(row.calculated_monthly_payment)
            : undefined,
          interest_rate_changes: row.interest_rate_changes,
          payment_count: row.payment_count,
          total_interest_paid: row.total_interest_paid
            ? parseNumeric(row.total_interest_paid)
            : undefined,
          last_payment_date_actual: row.last_payment_date_actual || undefined,
        }
      })

      // 验证数据
      return liabilities.map((liability) => {
        const result = liabilitySchema.safeParse(liability)
        if (result.success) {
          return result.data
        } else {
          console.warn('Liability validation failed:', result.error, liability)
          return liability
        }
      })
    },
  })
}
