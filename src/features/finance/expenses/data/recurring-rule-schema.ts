import { z } from 'zod'

// 周期性记账规则的数据模型（匹配 Supabase recurring_rules 表）
export const recurringRuleSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid().nullable().optional(), // 保留用于记录创建者，但不再用于权限控制
  device_name: z.string().nullable().optional(), // 设备名称，用于标识
  
  // 模板字段
  amount: z.number(),
  category: z.string().nullable(),
  currency: z.string().nullable().default('CNY'),
  note: z.string().nullable(),
  
  // 周期规则
  frequency_type: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval_value: z.number().int().positive().default(1),
  
  // 规则细节
  weekly_day_of_week: z.number().int().min(1).max(7).nullable(), // 1=周一, 7=周日
  monthly_day_of_month: z.number().int().min(1).max(31).nullable(),
  is_last_day_of_month: z.boolean().default(false),
  
  // 时间范围
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  timezone: z.string().default('Asia/Shanghai'),
  
  // 执行状态
  next_run_at: z.string(), // timestamptz
  last_run_at: z.string().nullable(),
  status: z.enum(['active', 'paused']).default('active'),
  
  // 元数据
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export type RecurringRule = z.infer<typeof recurringRuleSchema>

// 创建周期性记账规则的表单数据
export const createRecurringRuleSchema = z.object({
  amount: z.number().positive('金额必须大于0'),
  category: z.string().nullable(),
  currency: z.string().nullable(),
  note: z.string().nullable(),
  device_name: z.string().nullable().optional(), // 设备名称
  frequency_type: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval_value: z.number().int().positive(),
  weekly_day_of_week: z.number().int().min(1).max(7).nullable().optional(),
  monthly_day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  is_last_day_of_month: z.boolean().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  timezone: z.string().optional(),
  next_run_at: z.string(),
  status: z.enum(['active', 'paused']).optional(),
}).refine(
  (data) => {
    if (data.frequency_type === 'weekly') {
      return data.weekly_day_of_week !== null && data.weekly_day_of_week !== undefined
    }
    return true
  },
  {
    message: '周度周期必须指定周几',
    path: ['weekly_day_of_week'],
  }
).refine(
  (data) => {
    if (data.frequency_type === 'monthly') {
      return data.monthly_day_of_month !== null && data.monthly_day_of_month !== undefined || data.is_last_day_of_month === true
    }
    return true
  },
  {
    message: '月度周期必须指定每月第几天或选择最后一天',
    path: ['monthly_day_of_month'],
  }
)

export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>

// 更新周期性记账规则的表单数据（所有字段可选）
export const updateRecurringRuleSchema = createRecurringRuleSchema.partial().extend({
  id: z.number(),
})

export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>

