import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
      const { data, error } = await supabase
        .from('liabilities')
        .insert([input])
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
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
      const { data, error } = await supabase
        .from('liabilities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
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
      const { error } = await supabase.from('liabilities').delete().eq('id', id)

      if (error) {
        throw error
      }
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
