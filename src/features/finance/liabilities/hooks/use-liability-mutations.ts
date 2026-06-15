import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  hyperliquidApiPost,
  hyperliquidApiPatch,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'
import type { Liability } from '../data/schema'
import { toast } from 'sonner'

type CreateLiabilityInput = Omit<
  Liability,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'user_id'
  | 'avg_annual_rate'
  | 'calculated_remaining_principal'
  | 'paid_periods'
  | 'calculated_monthly_payment'
  | 'interest_rate_changes'
  | 'payment_count'
  | 'total_interest_paid'
  | 'last_payment_date_actual'
>

type UpdateLiabilityInput = Partial<CreateLiabilityInput> & { id: number }

export function useLiabilityMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (input: CreateLiabilityInput) => {
      const userId = useAuthStore.getState().user?.id
      return hyperliquidApiPost('/api/finance/liabilities', { ...input, user_id: userId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] })
      toast.success('负债创建成功')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateLiabilityInput) => {
      const { id, ...updateData } = input
      return hyperliquidApiPatch(`/api/finance/liabilities/${id}`, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] })
      toast.success('负债更新成功')
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await hyperliquidApiDelete(`/api/finance/liabilities/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] })
      toast.success('负债删除成功')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
