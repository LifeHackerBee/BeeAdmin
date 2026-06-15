import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  hyperliquidApiPost,
  hyperliquidApiPatch,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import { useAuthStore } from '@/stores/auth-store'
import type { Asset } from '../data/schema'
import { toast } from 'sonner'

type CreateAssetInput = Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'user_id'>
type UpdateAssetInput = Partial<CreateAssetInput> & { id: number }

export function useAssetMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const userId = useAuthStore.getState().user?.id
      return hyperliquidApiPost('/api/finance/assets', { ...input, user_id: userId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('资产创建成功')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateAssetInput) => {
      const { id, ...updateData } = input
      return hyperliquidApiPatch(`/api/finance/assets/${id}`, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('资产更新成功')
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await hyperliquidApiDelete(`/api/finance/assets/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('资产删除成功')
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
