import { z } from 'zod'

// 负债类型枚举
export const liabilityTypeSchema = z.enum([
  'mortgage', // 房贷
  'car_loan', // 车贷
  'personal_loan', // 个人贷款
  'credit_card', // 信用卡
  'other', // 其他
])

// 还款方式枚举
export const paymentMethodSchema = z.enum([
  'equal_payment', // 等额本息
  'equal_principal', // 等额本金
  'daily_interest', // 按日计息（房贷）
  'interest_only', // 只还利息
  'other', // 其他
])

// 负债状态枚举
export const liabilityStatusSchema = z.enum([
  'active', // 进行中
  'paid_off', // 已还清
  'defaulted', // 违约
  'other', // 其他
])

// 负债数据模型（匹配 Supabase liabilities 表）
export const liabilitySchema = z.object({
  id: z.number(),
  user_id: z.string().uuid().optional(),
  name: z.string(),
  type: liabilityTypeSchema,
  total_amount: z.number(),
  initial_principal: z.number(), // 初始本金
  paid_amount: z.number(),
  remaining_principal: z.number(), // 剩余本金
  total_periods: z.number(), // 总期数
  remaining_periods: z.number(), // 剩余期数
  start_date: z.string(), // ISO date string
  first_payment_date: z.string(), // 首次还款日期
  last_payment_date: z.string().nullable().optional(), // 最后还款日期
  monthly_payment: z.number().nullable().optional(), // 月供（可为空，支持自动计算）
  payment_method: paymentMethodSchema,
  payment_day: z.number().min(1).max(31),
  current_annual_rate: z.number(), // 当前年利率
  current_rate_effective_date: z.string(), // 当前利率生效日期
  currency: z.string().default('CNY'),
  status: liabilityStatusSchema,
  note: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  // 视图字段（来自 liability_details 视图）
  avg_annual_rate: z.number().optional(), // 平均年利率
  calculated_remaining_principal: z.number().optional(), // 计算得出的剩余本金
  paid_periods: z.number().optional(), // 已还期数
  calculated_monthly_payment: z.number().optional(), // 计算得出的月供
  interest_rate_changes: z.number().optional(), // 利率变更次数
  payment_count: z.number().optional(), // 还款次数
  total_interest_paid: z.number().optional(), // 已还利息总额
  last_payment_date_actual: z.string().nullable().optional(), // 实际最后还款日期
})

export type Liability = z.infer<typeof liabilitySchema>
export type LiabilityType = z.infer<typeof liabilityTypeSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type LiabilityStatus = z.infer<typeof liabilityStatusSchema>

// 数据库返回的类型（Supabase 返回的格式）
export type LiabilityRow = {
  id: number
  user_id?: string
  name: string
  type: string
  total_amount: number | string
  initial_principal: number | string
  paid_amount: number | string
  remaining_principal: number | string
  total_periods: number
  remaining_periods: number
  start_date: string
  first_payment_date: string
  last_payment_date?: string | null
  monthly_payment?: number | string | null
  payment_method: string
  payment_day: number
  current_annual_rate: number | string
  current_rate_effective_date: string
  currency: string
  status: string
  note: string | null
  created_at?: string
  updated_at?: string
  // 视图字段
  avg_annual_rate?: number | string
  calculated_remaining_principal?: number | string
  paid_periods?: number
  calculated_monthly_payment?: number | string
  interest_rate_changes?: number
  payment_count?: number
  total_interest_paid?: number | string
  last_payment_date_actual?: string | null
}

// 负债类型显示名称映射
export const liabilityTypeLabels: Record<LiabilityType, string> = {
  mortgage: '房贷',
  car_loan: '车贷',
  personal_loan: '个人贷款',
  credit_card: '信用卡',
  other: '其他',
}

// 还款方式显示名称映射
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  equal_payment: '等额本息',
  equal_principal: '等额本金',
  daily_interest: '按日计息（房贷）',
  interest_only: '只还利息',
  other: '其他',
}

// 负债状态显示名称映射
export const liabilityStatusLabels: Record<LiabilityStatus, string> = {
  active: '进行中',
  paid_off: '已还清',
  defaulted: '违约',
  other: '其他',
}
