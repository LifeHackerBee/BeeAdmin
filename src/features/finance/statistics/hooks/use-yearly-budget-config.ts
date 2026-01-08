import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

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

  // 获取当前用户的年度预算配置
  const { data, isLoading, error } = useQuery({
    queryKey: ['yearly-budget-config', currentYear],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      const { data: configData, error: fetchError } = await supabase
        .from('budget_config')
        .select('*')
        .eq('year', currentYear)
        .is('month', null) // 只查询年度配置（month 为 null）
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
        yearly_budget: configData.yearly_budget || null,
        category_yearly_budgets: configData.category_yearly_budgets || {},
      } as YearlyBudgetConfig
    },
  })

  // 更新或创建年度预算配置
  const updateMutation = useMutation({
    mutationFn: async ({
      yearlyBudget,
      categoryYearlyBudgets,
    }: {
      yearlyBudget?: number | null
      categoryYearlyBudgets?: Record<string, number>
    }) => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      const updateData: any = {
        year: currentYear,
        user_id: sessionData.session.user.id,
        month: null, // 年度配置不需要 month 字段
      }

      if (yearlyBudget !== undefined) {
        updateData.yearly_budget = yearlyBudget
      }
      if (categoryYearlyBudgets !== undefined) {
        updateData.category_yearly_budgets = categoryYearlyBudgets
      }

      // 先尝试更新
      const { data: existing } = await supabase
        .from('budget_config')
        .select('id')
        .eq('year', currentYear)
        .is('month', null) // 只查询年度配置（month 为 null）
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
        return updatedData as YearlyBudgetConfig
      } else {
        // 创建新配置
        const { data: newData, error: insertError } = await supabase
          .from('budget_config')
          .insert(updateData)
          .select()
          .single()

        if (insertError) throw insertError
        return newData as YearlyBudgetConfig
      }
    },
    onSuccess: () => {
      // 刷新查询
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

