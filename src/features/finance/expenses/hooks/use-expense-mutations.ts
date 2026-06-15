import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  hyperliquidApiPost,
  hyperliquidApiPatch,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import { toast } from 'sonner'

type ExpenseInput = {
  spending_time: string
  amount: number
  category: string
  currency: string
  note?: string | null
  device_name?: string | null
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ExpenseInput) => {
      return hyperliquidApiPost('/api/finance/expenses', data)
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
    mutationFn: async ({ id, data }: { id: number; data: ExpenseInput }) => {
      return hyperliquidApiPatch(`/api/finance/expenses/${id}`, data)
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
      await hyperliquidApiDelete(`/api/finance/expenses/${id}`)
      return id
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
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
      const res = await hyperliquidApiPost<{ ids: number[]; deletedCount: number }>(
        '/api/finance/expenses/batch-delete',
        { ids }
      )
      return { ids, deletedCount: res.deletedCount ?? 0 }
    },
    onSuccess: async ({ deletedCount }) => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      await queryClient.refetchQueries({ queryKey: ['expenses'] })
      toast.success(`已删除 ${deletedCount} 条记录`)
    },
    onError: (error: Error) => {
      console.error('Batch delete expenses error:', error)
      toast.error(`批量删除失败: ${error.message}`)
    },
  })
}
