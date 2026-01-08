import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { type ExpenseCategory, expenseCategorySchema, type CreateExpenseCategoryInput } from '../data/category-schema'

// 查询所有记账类型（共享分类，所有用户看到的都一样）
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      // 转换和验证数据
      const categories: ExpenseCategory[] = (data || []).map((row) => {
        return {
          id: row.id,
          user_id: row.user_id || undefined,
          label: row.label,
          value: row.value,
          icon_name: row.icon_name,
          color: row.color,
          sort_order: row.sort_order || 0,
          is_active: row.is_active !== false,
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
        }
      })

      return categories.map((category) => {
        const result = expenseCategorySchema.safeParse(category)
        if (result.success) {
          return result.data
        } else {
          console.warn('Expense category validation failed:', result.error, category)
          return category
        }
      })
    },
  })
}

// 查询所有记账类型（包括非激活的）
export function useAllExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      const categories: ExpenseCategory[] = (data || []).map((row) => {
        return {
          id: row.id,
          user_id: row.user_id || undefined,
          label: row.label,
          value: row.value,
          icon_name: row.icon_name,
          color: row.color,
          sort_order: row.sort_order || 0,
          is_active: row.is_active !== false,
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
        }
      })

      return categories.map((category) => {
        const result = expenseCategorySchema.safeParse(category)
        if (result.success) {
          return result.data
        } else {
          console.warn('Expense category validation failed:', result.error, category)
          return category
        }
      })
    },
  })
}

// 创建记账类型
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateExpenseCategoryInput) => {
      // 获取当前用户 ID（用于记录创建者，但分类是共享的）
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('未登录')
      }

      const { data: result, error } = await supabase
        .from('expense_categories')
        .insert([
          {
            ...data,
            user_id: sessionData.session.user.id, // 记录创建者，但分类对所有用户可见
            sort_order: data.sort_order ?? 0,
            is_active: data.is_active ?? true,
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
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] })
      toast.success('记账类型已创建')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })
}

// 更新记账类型
export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateExpenseCategoryInput> }) => {
      const { data: result, error } = await supabase
        .from('expense_categories')
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
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] })
      toast.success('记账类型已更新')
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })
}

// 删除记账类型（软删除：设置为非激活）
export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // 软删除：设置为非激活
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        throw error
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] })
      toast.success('记账类型已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })
}

// 硬删除记账类型
export function useHardDeleteExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] })
      toast.success('记账类型已永久删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })
}

