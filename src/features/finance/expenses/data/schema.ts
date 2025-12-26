import { z } from 'zod'

// 记账记录的数据模型（匹配 Supabase expenses 表）
// 注意：数据库中的字段可能为 null，所以使用 nullable() 或 optional()
export const expenseSchema = z.object({
  id: z.number(),
  created_at: z.string().nullable().optional(),
  device_name: z.string().nullable(),
  spending_time: z.string().nullable(), // timestamptz (可能为 null)
  category: z.string().nullable(), // 分类 (Transport, Food, Others, Workout 等)
  amount: z.number().nullable(), // 金额 (numeric，可能为 null)
  currency: z.string().nullable(), // 币种 (CNY, HKD，可能为 null)
  note: z.string().nullable(), // 备注
})

export type Expense = z.infer<typeof expenseSchema>

// 数据库返回的类型（Supabase 返回的格式）
export type ExpenseRow = {
  id: number
  created_at?: string
  device_name: string | null
  spending_time: string
  category: string
  amount: number
  currency: string
  note: string | null
}

