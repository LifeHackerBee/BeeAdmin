import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { KolEntryInput, KolPerformanceRecord } from '../types'

const QUERY_KEY = 'kol-daily-performance'

export function useKolPerformance(params?: { from?: string; to?: string; kol?: string }) {
  const queryClient = useQueryClient()

  const list = useQuery<KolPerformanceRecord[]>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      let q = supabase
        .from('kol_daily_performance')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false })

      if (params?.from) q = q.gte('date', params.from)
      if (params?.to) q = q.lte('date', params.to)
      if (params?.kol) q = q.eq('kol_name', params.kol)

      const { data, error } = await q
      if (error) throw error
      return data as KolPerformanceRecord[]
    },
  })

  const createOne = useMutation({
    mutationFn: async (input: KolEntryInput) => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) throw new Error('未登录')

      const { data, error } = await supabase
        .from('kol_daily_performance')
        .insert({ ...input, user_id: sessionData.session.user.id })
        .select()
        .single()
      if (error) throw error
      return data as KolPerformanceRecord
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const createMany = useMutation({
    mutationFn: async (inputs: KolEntryInput[]) => {
      if (!inputs.length) return []
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) throw new Error('未登录')
      const uid = sessionData.session.user.id

      const { data, error } = await supabase
        .from('kol_daily_performance')
        .insert(inputs.map((i) => ({ ...i, user_id: uid })))
        .select()
      if (error) throw error
      return data as KolPerformanceRecord[]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  const removeOne = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('kol_daily_performance').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })

  return {
    records: list.data || [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    createOne: createOne.mutateAsync,
    createMany: createMany.mutateAsync,
    removeOne: removeOne.mutateAsync,
    isMutating: createOne.isPending || createMany.isPending || removeOne.isPending,
  }
}
