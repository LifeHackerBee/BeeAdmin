import { z } from 'zod'

// 记账类型的数据模型（匹配 Supabase expense_categories 表）
// 注意：分类现在是共享的，所有用户看到相同的分类，user_id 仅用于记录创建者信息
export const expenseCategorySchema = z.object({
  id: z.number(),
  user_id: z.string().uuid().nullable().optional(), // 可选：仅用于记录创建者
  label: z.string().min(1, '标签不能为空').max(100, '标签长度不能超过100个字符'),
  value: z.string().min(1, '值不能为空').max(50, '值长度不能超过50个字符'),
  icon_name: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>

// 创建记账类型的表单数据
export const createExpenseCategorySchema = z.object({
  label: z.string().min(1, '标签不能为空').max(100, '标签长度不能超过100个字符'),
  value: z.string().min(1, '值不能为空').max(50, '值长度不能超过50个字符').regex(/^[A-Z][a-zA-Z0-9]*$/, '值必须以大写字母开头，只能包含字母和数字'),
  icon_name: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>

// 更新记账类型的表单数据（所有字段可选）
export const updateExpenseCategorySchema = createExpenseCategorySchema.partial().extend({
  id: z.number(),
})

export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>

