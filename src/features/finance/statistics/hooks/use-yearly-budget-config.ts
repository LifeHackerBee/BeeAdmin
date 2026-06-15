import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { hyperliquidApiGet, hyperliquidApiPut } from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'

export type YearlyBudgetConfig = {
  id: number
  user_id: string
  year: string // YYYY
  yearly_budget: number | null
  category_yearly_budgets: Record<string, number> | null
  created_at?: string
  updated_at?: string
}

export function useYearlyBudgetConfig(year?: string) {
  const currentYear = year || format(new Date(), 'yyyy')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['yearly-budget-config', currentYear],
    queryFn: async () => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      const configData = await hyperliquidApiGet<YearlyBudgetConfig | null>(
        `/api/finance/budget-config/yearly?user_id=${encodeURIComponent(userId)}&year=${currentYear}`
      )
      if (!configData) return null
      return {
        ...configData,
        yearly_budget: configData.yearly_budget || null,
        category_yearly_budgets: configData.category_yearly_budgets || {},
      } as YearlyBudgetConfig
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      yearlyBudget,
      categoryYearlyBudgets,
    }: {
      yearlyBudget?: number | null
      categoryYearlyBudgets?: Record<string, number>
    }) => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      const payload: Record<string, unknown> = { user_id: userId, year: currentYear }
      if (yearlyBudget !== undefined) payload.yearly_budget = yearlyBudget
      if (categoryYearlyBudgets !== undefined) payload.category_yearly_budgets = categoryYearlyBudgets
      return hyperliquidApiPut<YearlyBudgetConfig>('/api/finance/budget-config/yearly', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yearly-budget-config', currentYear] })
    },
  })

  return {
    config: data || null,
    isLoading,
    error,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
