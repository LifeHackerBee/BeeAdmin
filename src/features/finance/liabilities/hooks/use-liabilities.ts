import { useQuery } from '@tanstack/react-query'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'
import { type Liability, liabilitySchema } from '../data/schema'

export function useLiabilities() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['liabilities'],
    enabled: !loading && !!user, // 只有在已登录且不在加载状态时才执行查询
    queryFn: async () => {
      // 后端 /liabilities 已附带原视图 liability_details 的计算字段
      const data = await hyperliquidApiGet<Record<string, unknown>[]>('/api/finance/liabilities')

      const parseNumeric = (value: number | string | null | undefined): number => {
        if (value === null || value === undefined) return 0
        return typeof value === 'string' ? parseFloat(value) : value
      }
      const num = (v: unknown) => v as number | string | null | undefined

      const liabilities: Liability[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as number,
        user_id: row.user_id as string,
        name: row.name as string,
        type: row.type as Liability['type'],
        total_amount: parseNumeric(num(row.total_amount)),
        initial_principal: parseNumeric(num(row.initial_principal)),
        paid_amount: parseNumeric(num(row.paid_amount)),
        remaining_principal: parseNumeric(num(row.remaining_principal)),
        total_periods: row.total_periods as number,
        remaining_periods: row.remaining_periods as number,
        start_date: row.start_date as string,
        first_payment_date: row.first_payment_date as string,
        last_payment_date: (row.last_payment_date as string) || undefined,
        monthly_payment: row.monthly_payment ? parseNumeric(num(row.monthly_payment)) : undefined,
        payment_method: row.payment_method as Liability['payment_method'],
        payment_day: row.payment_day as number,
        current_annual_rate: parseNumeric(num(row.current_annual_rate)),
        current_rate_effective_date: row.current_rate_effective_date as string,
        currency: (row.currency as string) || 'CNY',
        status: row.status as Liability['status'],
        note: row.note as string | null,
        created_at: (row.created_at as string) || undefined,
        updated_at: (row.updated_at as string) || undefined,
        // 计算字段
        avg_annual_rate: row.avg_annual_rate ? parseNumeric(num(row.avg_annual_rate)) : undefined,
        calculated_remaining_principal: row.calculated_remaining_principal
          ? parseNumeric(num(row.calculated_remaining_principal))
          : undefined,
        paid_periods: row.paid_periods as number,
        calculated_monthly_payment: row.calculated_monthly_payment
          ? parseNumeric(num(row.calculated_monthly_payment))
          : undefined,
        interest_rate_changes: row.interest_rate_changes as number,
        payment_count: row.payment_count as number,
        total_interest_paid: row.total_interest_paid
          ? parseNumeric(num(row.total_interest_paid))
          : undefined,
        last_payment_date_actual: (row.last_payment_date_actual as string) || undefined,
      }))

      return liabilities.map((liability) => {
        const result = liabilitySchema.safeParse(liability)
        if (result.success) return result.data
        console.warn('Liability validation failed:', result.error, liability)
        return liability
      })
    },
  })
}
