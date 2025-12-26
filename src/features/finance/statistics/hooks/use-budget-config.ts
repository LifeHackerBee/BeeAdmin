import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

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

  // 获取当前用户的预算配置
  const { data, isLoading, error } = useQuery({
    queryKey: ['budget-config', currentMonth],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      const { data: configData, error: fetchError } = await supabase
        .from('budget_config')
        .select('*')
        .eq('month', currentMonth)
        .single()

      if (fetchError) {
        // 如果没有找到配置，返回 null（不是错误）
        if (fetchError.code === 'PGRST116') {
          return null
        }
        throw fetchError
      }

      return {
        ...configData,
        category_budgets: configData.category_budgets || {},
      } as BudgetConfig
    },
  })

  // 更新或创建预算配置
  const updateMutation = useMutation({
    mutationFn: async ({
      totalBudget,
      categoryBudgets,
    }: {
      totalBudget?: number | null
      categoryBudgets?: Record<string, number>
    }) => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      const updateData: Partial<BudgetConfig> = {
        month: currentMonth,
        user_id: sessionData.session.user.id,
      }

      if (totalBudget !== undefined) {
        updateData.total_budget = totalBudget
      }
      if (categoryBudgets !== undefined) {
        updateData.category_budgets = categoryBudgets
      }

      // 先尝试更新
      const { data: existing } = await supabase
        .from('budget_config')
        .select('id')
        .eq('month', currentMonth)
        .single()

      if (existing) {
        // 更新现有配置
        const { data: updatedData, error: updateError } = await supabase
          .from('budget_config')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError
        return updatedData as BudgetConfig
      } else {
        // 创建新配置
        const { data: newData, error: insertError } = await supabase
          .from('budget_config')
          .insert(updateData)
          .select()
          .single()

        if (insertError) throw insertError
        return newData as BudgetConfig
      }
    },
    onSuccess: () => {
      // 刷新查询
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

