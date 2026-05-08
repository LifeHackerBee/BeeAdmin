import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { KolMvpInsert, KolMvpRecord } from '../types'

const QUERY_KEY = 'kol-mvp-log'
const PAGE_SIZE = 1000

export function useKolMvpLog(params?: { from?: string; to?: string }) {
  const queryClient = useQueryClient()

  const list = useQuery<KolMvpRecord[]>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const all: KolMvpRecord[] = []
      for (let from = 0; ; from += PAGE_SIZE) {
        let q = supabase
          .from('kol_mvp_log')
          .select('*')
          .order('date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)
        if (params?.from) q = q.gte('date', params.from)
        if (params?.to) q = q.lte('date', params.to)
        const { data, error } = await q
        if (error) throw error
        const rows = (data ?? []) as KolMvpRecord[]
        all.push(...rows)
        if (rows.length < PAGE_SIZE) break
      }
      return all
    },
  })

  const importMany = useMutation({
    mutationFn: async (inputs: KolMvpInsert[]) => {
      if (!inputs.length) return { inserted: 0 }
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) throw new Error('未登录')
      const uid = sessionData.session.user.id

      const payload = inputs.map((i) => ({ ...i, user_id: uid }))
      let inserted = 0
      const CHUNK = 500
      for (let i = 0; i < payload.length; i += CHUNK) {
        const chunk = payload.slice(i, i + CHUNK)
        const { data, error } = await supabase
          .from('kol_mvp_log')
          .upsert(chunk, {
            onConflict: 'user_id,date,kol_name,line_hash',
            ignoreDuplicates: true,
          })
          .select('id')
        if (error) throw error
        inserted += data?.length ?? 0
      }
      return { inserted }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeOne = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('kol_mvp_log').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeBatch = useMutation({
    mutationFn: async (sourceBatch: string) => {
      const { error } = await supabase
        .from('kol_mvp_log')
        .delete()
        .eq('source_batch', sourceBatch)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeAll = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) throw new Error('未登录')
      const { error } = await supabase
        .from('kol_mvp_log')
        .delete()
        .eq('user_id', sessionData.session.user.id)
      if (error) throw error
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
