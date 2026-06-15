import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import type { KolMvpInsert, KolMvpRecord } from '../types'

const QUERY_KEY = 'kol-mvp-log'

function currentUserId(): string {
  // 登录改为 Auth0，user_id 取自 auth-store（由 Auth0Bridge 填充）
  const user = useAuthStore.getState().user
  if (!user) throw new Error('未登录')
  return user.id
}

export function useKolMvpLog(params?: { from?: string; to?: string }) {
  const queryClient = useQueryClient()

  const list = useQuery<KolMvpRecord[]>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (params?.from) qs.set('from', params.from)
      if (params?.to) qs.set('to', params.to)
      const suffix = qs.toString() ? `?${qs.toString()}` : ''
      const res = await hyperliquidApiGet<{ success: boolean; records: KolMvpRecord[] }>(
        `/api/beetrader/kol${suffix}`
      )
      return res.records ?? []
    },
  })

  const importMany = useMutation({
    mutationFn: async (inputs: KolMvpInsert[]) => {
      if (!inputs.length) return { inserted: 0 }
      const uid = await currentUserId()
      const res = await hyperliquidApiPost<{ success: boolean; inserted: number }>(
        '/api/beetrader/kol/import',
        { user_id: uid, records: inputs }
      )
      return { inserted: res.inserted ?? 0 }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeOne = useMutation({
    mutationFn: async (id: number) => {
      await hyperliquidApiDelete(`/api/beetrader/kol/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeBatch = useMutation({
    mutationFn: async (sourceBatch: string) => {
      await hyperliquidApiPost('/api/beetrader/kol/delete-batch', {
        source_batch: sourceBatch,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeAll = useMutation({
    mutationFn: async () => {
      const uid = await currentUserId()
      await hyperliquidApiPost('/api/beetrader/kol/delete-all', { user_id: uid })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  return {
    records: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    importMany: importMany.mutateAsync,
    removeOne: removeOne.mutateAsync,
    removeBatch: removeBatch.mutateAsync,
    removeAll: removeAll.mutateAsync,
    isMutating:
      importMany.isPending || removeOne.isPending || removeBatch.isPending || removeAll.isPending,
  }
}
