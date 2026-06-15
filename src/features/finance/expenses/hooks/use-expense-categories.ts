import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiPatch,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { type ExpenseCategory, expenseCategorySchema, type CreateExpenseCategoryInput } from '../data/category-schema'

type CategoryRow = {
  id: number
  user_id?: string | null
  label: string
  value: string
  icon_name?: string | null
  color?: string | null
  sort_order?: number | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

function mapCategories(data: CategoryRow[]): ExpenseCategory[] {
  const categories: ExpenseCategory[] = (data || []).map((row) => ({
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
  }))
  return categories.map((category) => {
    const result = expenseCategorySchema.safeParse(category)
    if (result.success) return result.data
    console.warn('Expense category validation failed:', result.error, category)
    return category
  })
}

// 查询所有记账类型（共享分类，所有用户看到的都一样）
export function useExpenseCategories() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['expense-categories'],
    enabled: !loading && !!user,
    queryFn: async () => {
      const data = await hyperliquidApiGet<CategoryRow[]>(
        '/api/finance/expense-categories?active_only=true'
      )
      return mapCategories(data)
    },
  })
}

// 查询所有记账类型（包括非激活的）
export function useAllExpenseCategories() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  return useQuery({
    queryKey: ['expense-categories-all'],
    enabled: !loading && !!user,
    queryFn: async () => {
      const data = await hyperliquidApiGet<CategoryRow[]>(
        '/api/finance/expense-categories?active_only=false'
      )
      return mapCategories(data)
    },
  })
}

// 创建记账类型
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateExpenseCategoryInput) => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('未登录')
      return hyperliquidApiPost('/api/finance/expense-categories', {
        ...data,
        user_id: userId,
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
      })
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
      return hyperliquidApiPatch(`/api/finance/expense-categories/${id}`, data)
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
      await hyperliquidApiDelete(`/api/finance/expense-categories/${id}`)
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
      await hyperliquidApiDelete(`/api/finance/expense-categories/${id}?hard=true`)
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
