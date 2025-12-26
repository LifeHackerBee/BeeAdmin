import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      spending_time: string
      amount: number
      category: string
      currency: string
      note?: string | null
      device_name?: string | null
    }) => {
      const { data: result, error } = await supabase
        .from('expenses')
        .insert([data])
        .select()
        .single()

      if (error) {
        throw error
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('记账记录已创建')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: {
        spending_time: string
        amount: number
        category: string
        currency: string
        note?: string | null
        device_name?: string | null
      }
    }) => {
      const { data: result, error } = await supabase
        .from('expenses')
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('记账记录已更新')
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase delete error:', error)
        // 检查是否是权限错误
        if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
          throw new Error('删除失败：没有删除权限。请在 Supabase 中执行 expense_rls_update.sql 文件来添加删除策略。')
        }
        throw error
      }

      // 检查是否真的删除了数据
      if (!data || data.length === 0) {
        const errorMsg = '删除失败：未找到要删除的记录或没有删除权限。请检查 Supabase RLS 策略是否正确配置。'
        console.error(errorMsg, { id, data, error })
        throw new Error(errorMsg)
      }

      console.log('Successfully deleted expense:', data)
      return id
    },
    onSuccess: async () => {
      // 立即刷新查询，使用 refetch 确保数据更新
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      // 强制刷新查询
      await queryClient.refetchQueries({ queryKey: ['expenses'] })
      toast.success('记账记录已删除')
    },
    onError: (error: Error) => {
      console.error('Delete expense error:', error)
      toast.error(`删除失败: ${error.message}`)
    },
  })
}

export function useDeleteExpenses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data, error } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids)
        .select()

      if (error) {
        console.error('Supabase batch delete error:', error)
        // 检查是否是权限错误
        if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
          throw new Error('批量删除失败：没有删除权限。请在 Supabase 中执行 expense_rls_update.sql 文件来添加删除策略。')
        }
        throw error
      }

      // 检查是否真的删除了数据
      const deletedCount = data?.length || 0
      if (deletedCount === 0) {
        const errorMsg = '批量删除失败：未找到要删除的记录或没有删除权限。请检查 Supabase RLS 策略是否正确配置。'
        console.error(errorMsg, { ids, data, error })
        throw new Error(errorMsg)
      }

      console.log('Successfully deleted expenses:', data)
      return { ids, deletedCount }
    },
    onSuccess: async ({ deletedCount }) => {
      // 立即刷新查询，使用 refetch 确保数据更新
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      // 强制刷新查询
      await queryClient.refetchQueries({ queryKey: ['expenses'] })
      toast.success(`已删除 ${deletedCount} 条记录`)
    },
    onError: (error: Error) => {
      console.error('Batch delete expenses error:', error)
      toast.error(`批量删除失败: ${error.message}`)
    },
  })
}

