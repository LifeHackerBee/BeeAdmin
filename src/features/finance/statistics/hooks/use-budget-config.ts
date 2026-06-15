import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { hyperliquidApiGet, hyperliquidApiPut } from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'

export type BudgetConfig = {
  id: number
  user_id: string
  month: string // YYYY-MM
  year?: string | null // YYYY
  total_budget: number | null
  yearly_budget?: number | null
  category_budgets: Record<string, number> | null
  created_at?: string
  updated_at?: string
}

export function useBudgetConfig(month?: string) {
  const currentMonth = month || format(new Date(), 'yyyy-MM')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-config', currentMonth],
    queryFn: async () => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      const configData = await hyperliquidApiGet<BudgetConfig | null>(
        `/api/finance/budget-config?user_id=${encodeURIComponent(userId)}&month=${currentMonth}`
      )
      if (!configData) return null
      return { ...configData, category_budgets: configData.category_budgets || {} } as BudgetConfig
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      totalBudget,
      categoryBudgets,
    }: {
      totalBudget?: number | null
      categoryBudgets?: Record<string, number>
    }) => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      const payload: Record<string, unknown> = { user_id: userId, month: currentMonth }
      if (totalBudget !== undefined) payload.total_budget = totalBudget
      if (categoryBudgets !== undefined) payload.category_budgets = categoryBudgets
      return hyperliquidApiPut<BudgetConfig>('/api/finance/budget-config', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-config', currentMonth] })
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
