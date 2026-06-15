import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'
import type { KolMvpInsert, KolMvpRecord } from '../types'

const QUERY_KEY = 'kol-mvp-log'

async function currentUserId(): Promise<string> {
  // 登录/会话仍由 Supabase Auth 负责，这里取 user_id 传给后端
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session?.user) throw new Error('未登录')
  return sessionData.session.user.id
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
