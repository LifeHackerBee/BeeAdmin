import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { type RecurringRule, recurringRuleSchema, type CreateRecurringRuleInput } from '../data/recurring-rule-schema'

// 查询所有周期性记账规则
export function useRecurringRules() {
  return useQuery({
    queryKey: ['recurring-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // 转换数据格式，确保类型正确
      const rules: RecurringRule[] = (data || []).map((row) => {
        // 处理 amount：可能是 string (numeric) 或 number
        let amount: number = 0
        if (row.amount !== null && row.amount !== undefined) {
          const amountValue = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount
          if (!isNaN(amountValue)) {
            amount = amountValue
          }
        }

        return {
          id: row.id,
          user_id: row.user_id,
          amount,
          category: row.category,
          currency: row.currency || 'CNY',
          note: row.note,
          frequency_type: row.frequency_type,
          interval_value: row.interval_value || 1,
          weekly_day_of_week: row.weekly_day_of_week,
          monthly_day_of_month: row.monthly_day_of_month,
          is_last_day_of_month: row.is_last_day_of_month || false,
          start_date: row.start_date,
          end_date: row.end_date,
          timezone: row.timezone || 'Asia/Shanghai',
          next_run_at: row.next_run_at,
          last_run_at: row.last_run_at,
          status: row.status || 'active',
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
        }
      })

      // 验证数据
      return rules.map((rule) => {
        const result = recurringRuleSchema.safeParse(rule)
        if (result.success) {
          return result.data
        } else {
          console.warn('Recurring rule validation failed:', result.error, rule)
          return rule
        }
      })
    },
  })
}

// 查询待触发的周期性记账规则（next_run_at <= 当前时间且状态为 active）
export function usePendingRecurringRules() {
  return useQuery({
    queryKey: ['pending-recurring-rules'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('status', 'active')
        .lte('next_run_at', now)
        .order('next_run_at', { ascending: true })

      if (error) {
        throw error
      }

      // 转换数据格式
      const rules: RecurringRule[] = (data || []).map((row) => {
        let amount: number = 0
        if (row.amount !== null && row.amount !== undefined) {
          const amountValue = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount
          if (!isNaN(amountValue)) {
            amount = amountValue
          }
        }

        return {
          id: row.id,
          user_id: row.user_id,
          amount,
          category: row.category,
          currency: row.currency || 'CNY',
          note: row.note,
          frequency_type: row.frequency_type,
          interval_value: row.interval_value || 1,
          weekly_day_of_week: row.weekly_day_of_week,
          monthly_day_of_month: row.monthly_day_of_month,
          is_last_day_of_month: row.is_last_day_of_month || false,
          start_date: row.start_date,
          end_date: row.end_date,
          timezone: row.timezone || 'Asia/Shanghai',
          next_run_at: row.next_run_at,
          last_run_at: row.last_run_at,
          status: row.status || 'active',
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
        }
      })

      return rules
    },
  })
}

// 创建周期性记账规则
export function useCreateRecurringRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRecurringRuleInput) => {
      // 获取当前用户 ID
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      const { data: result, error } = await supabase
        .from('recurring_rules')
        .insert([
          {
            ...data,
            user_id: sessionData.session.user.id,
          },
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] })
      queryClient.invalidateQueries({ queryKey: ['pending-recurring-rules'] })
      toast.success('周期性记账规则已创建')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })
}

// 更新周期性记账规则
export function useUpdateRecurringRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateRecurringRuleInput> }) => {
      const { data: result, error } = await supabase
        .from('recurring_rules')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] })
      queryClient.invalidateQueries({ queryKey: ['pending-recurring-rules'] })
      toast.success('周期性记账规则已更新')
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })
}

// 删除周期性记账规则
export function useDeleteRecurringRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] })
      queryClient.invalidateQueries({ queryKey: ['pending-recurring-rules'] })
      toast.success('周期性记账规则已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })
}

// 执行周期性记账规则（创建实际的 expense 记录并更新 next_run_at）
export function useExecuteRecurringRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ruleId, spendingTime }: { ruleId: number; spendingTime: string }) => {
      // 1. 获取规则
      const { data: rule, error: ruleError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('id', ruleId)
        .single()

      if (ruleError || !rule) {
        throw new Error('未找到周期性记账规则')
      }

      // 2. 创建 expense 记录
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([
          {
            spending_time: spendingTime,
            amount: rule.amount,
            category: rule.category,
            currency: rule.currency || 'CNY',
            note: rule.note,
          },
        ])

      if (expenseError) {
        throw expenseError
      }

      // 3. 计算下次执行时间
      const nextRunAt = calculateNextRunAt({
        frequencyType: rule.frequency_type,
        intervalValue: rule.interval_value || 1,
        weeklyDayOfWeek: rule.weekly_day_of_week,
        monthlyDayOfMonth: rule.monthly_day_of_month,
        isLastDayOfMonth: rule.is_last_day_of_month || false,
        lastRunAt: spendingTime,
      })

      // 4. 更新规则的 last_run_at 和 next_run_at
      const { error: updateError } = await supabase
        .from('recurring_rules')
        .update({
          last_run_at: spendingTime,
          next_run_at: nextRunAt,
        })
        .eq('id', ruleId)

      if (updateError) {
        throw updateError
      }

      return { ruleId, nextRunAt }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] })
      queryClient.invalidateQueries({ queryKey: ['pending-recurring-rules'] })
      toast.success('周期性记账已执行')
    },
    onError: (error: Error) => {
      toast.error(`执行失败: ${error.message}`)
    },
  })
}

// 计算下次执行时间的工具函数
export function calculateNextRunAt({
  frequencyType,
  intervalValue,
  weeklyDayOfWeek,
  monthlyDayOfMonth,
  isLastDayOfMonth,
  lastRunAt,
}: {
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'yearly'
  intervalValue: number
  weeklyDayOfWeek?: number | null
  monthlyDayOfMonth?: number | null
  isLastDayOfMonth?: boolean
  lastRunAt: string
}): string {
  const baseDate = new Date(lastRunAt)

  switch (frequencyType) {
    case 'daily': {
      const nextDate = new Date(baseDate)
      nextDate.setDate(nextDate.getDate() + intervalValue)
      return nextDate.toISOString()
    }

    case 'weekly': {
      if (!weeklyDayOfWeek) {
        throw new Error('周度周期必须指定周几')
      }
      const nextDate = new Date(baseDate)
      // 计算到下一个指定周几
      const currentDayOfWeek = nextDate.getDay() === 0 ? 7 : nextDate.getDay() // 转换为 1-7（周一=1）
      const targetDayOfWeek = weeklyDayOfWeek // 1-7（周一=1）
      
      // 计算到本周目标周几需要的天数
      let daysToTarget = targetDayOfWeek - currentDayOfWeek
      
      if (daysToTarget <= 0) {
        // 如果目标日期已过或就是今天，则跳到下一个周期
        daysToTarget += 7 * intervalValue
      } else if (intervalValue > 1) {
        // 如果间隔大于1周，需要找到下一个周期的目标日期
        // 先找到本周的目标日期
        const targetDateThisWeek = new Date(nextDate)
        targetDateThisWeek.setDate(targetDateThisWeek.getDate() + daysToTarget)
        
        // 如果本周的目标日期就是今天，跳到下一个周期
        if (daysToTarget === 0) {
          daysToTarget = 7 * intervalValue
        } else {
          // 否则，找到下一个周期的目标日期
          // 计算从本周目标日期到下一个周期目标日期的天数
          daysToTarget = 7 * (intervalValue - 1) + daysToTarget
        }
      }
      
      nextDate.setDate(nextDate.getDate() + daysToTarget)
      return nextDate.toISOString()
    }

    case 'monthly': {
      const nextDate = new Date(baseDate)
      
      if (isLastDayOfMonth) {
        // 每月最后一天
        nextDate.setMonth(nextDate.getMonth() + intervalValue)
        // 设置为下个月的最后一天
        nextDate.setDate(0) // 设置为上个月的最后一天（即当前月的最后一天）
        return nextDate.toISOString()
      } else if (monthlyDayOfMonth) {
        // 每月第几天
        nextDate.setMonth(nextDate.getMonth() + intervalValue)
        // 处理月份天数不一致的情况（如 31 号在 2 月）
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
        nextDate.setDate(Math.min(monthlyDayOfMonth, daysInMonth))
        return nextDate.toISOString()
      } else {
        throw new Error('月度周期必须指定每月第几天或选择最后一天')
      }
    }

    case 'yearly': {
      const nextDate = new Date(baseDate)
      nextDate.setFullYear(nextDate.getFullYear() + intervalValue)
      return nextDate.toISOString()
    }

    default:
      throw new Error(`未知的周期类型: ${frequencyType}`)
  }
}

