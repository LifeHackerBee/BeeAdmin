import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiPatch,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { type RecurringRule, recurringRuleSchema, type CreateRecurringRuleInput } from '../data/recurring-rule-schema'

function mapRule(row: Record<string, unknown>): RecurringRule {
  let amount = 0
  if (row.amount !== null && row.amount !== undefined) {
    const v = typeof row.amount === 'string' ? parseFloat(row.amount as string) : (row.amount as number)
    if (!isNaN(v)) amount = v
  }
  return {
    id: row.id as number,
    user_id: (row.user_id as string) || undefined,
    device_name: (row.device_name as string) || undefined,
    amount,
    category: row.category as string,
    currency: (row.currency as string) || 'CNY',
    note: row.note as string | null,
    frequency_type: row.frequency_type as RecurringRule['frequency_type'],
    interval_value: (row.interval_value as number) || 1,
    weekly_day_of_week: row.weekly_day_of_week as number | null,
    monthly_day_of_month: row.monthly_day_of_month as number | null,
    is_last_day_of_month: (row.is_last_day_of_month as boolean) || false,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    timezone: (row.timezone as string) || 'Asia/Shanghai',
    next_run_at: row.next_run_at as string,
    last_run_at: row.last_run_at as string | null,
    status: (row.status as RecurringRule['status']) || 'active',
    created_at: (row.created_at as string) || undefined,
    updated_at: (row.updated_at as string) || undefined,
  } as RecurringRule
}

// 查询所有周期性记账规则
export function useRecurringRules() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['recurring-rules'],
    enabled: !loading && !!user,
    queryFn: async () => {
      const data = await hyperliquidApiGet<Record<string, unknown>[]>('/api/finance/recurring-rules')
      const rules = (data || []).map(mapRule)
      return rules.map((rule) => {
        const result = recurringRuleSchema.safeParse(rule)
        if (result.success) return result.data
        console.warn('Recurring rule validation failed:', result.error, rule)
        return rule
      })
    },
  })
}

// 查询待触发的周期性记账规则（next_run_at <= 当前时间且状态为 active）
export function usePendingRecurringRules() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['pending-recurring-rules'],
    enabled: !loading && !!user,
    queryFn: async () => {
      const data = await hyperliquidApiGet<Record<string, unknown>[]>(
        '/api/finance/recurring-rules/pending'
      )
      return (data || []).map(mapRule)
    },
  })
}

// 创建周期性记账规则
export function useCreateRecurringRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRecurringRuleInput) => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      return hyperliquidApiPost('/api/finance/recurring-rules', { ...data, user_id: userId })
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
      return hyperliquidApiPatch(`/api/finance/recurring-rules/${id}`, data)
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
      await hyperliquidApiDelete(`/api/finance/recurring-rules/${id}`)
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
      const rule = await hyperliquidApiGet<Record<string, unknown>>(
        `/api/finance/recurring-rules/${ruleId}`
      )
      if (!rule) throw new Error('未找到周期性记账规则')

      // 2. 创建 expense 记录
      await hyperliquidApiPost('/api/finance/expenses', {
        spending_time: spendingTime,
        amount: rule.amount,
        category: rule.category,
        currency: (rule.currency as string) || 'CNY',
        note: rule.note,
        device_name: rule.device_name || null,
      })

      // 3. 计算下次执行时间
      const nextRunAt = calculateNextRunAt({
        frequencyType: rule.frequency_type as 'daily' | 'weekly' | 'monthly' | 'yearly',
        intervalValue: (rule.interval_value as number) || 1,
        weeklyDayOfWeek: rule.weekly_day_of_week as number | null,
        monthlyDayOfMonth: rule.monthly_day_of_month as number | null,
        isLastDayOfMonth: (rule.is_last_day_of_month as boolean) || false,
        lastRunAt: spendingTime,
      })

      // 4. 更新规则的 last_run_at 和 next_run_at
      await hyperliquidApiPatch(`/api/finance/recurring-rules/${ruleId}`, {
        last_run_at: spendingTime,
        next_run_at: nextRunAt,
      })

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
      const currentDayOfWeek = nextDate.getDay() === 0 ? 7 : nextDate.getDay()
      const targetDayOfWeek = weeklyDayOfWeek

      let daysToTarget = targetDayOfWeek - currentDayOfWeek

      if (daysToTarget <= 0) {
        daysToTarget += 7 * intervalValue
      } else if (intervalValue > 1) {
        const targetDateThisWeek = new Date(nextDate)
        targetDateThisWeek.setDate(targetDateThisWeek.getDate() + daysToTarget)

        if (daysToTarget === 0) {
          daysToTarget = 7 * intervalValue
        } else {
          daysToTarget = 7 * (intervalValue - 1) + daysToTarget
        }
      }

      nextDate.setDate(nextDate.getDate() + daysToTarget)
      return nextDate.toISOString()
    }

    case 'monthly': {
      const nextDate = new Date(baseDate)

      if (isLastDayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + intervalValue)
        nextDate.setDate(0)
        return nextDate.toISOString()
      } else if (monthlyDayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + intervalValue)
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
