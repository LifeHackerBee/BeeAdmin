import { useState, useEffect, useCallback, useRef } from 'react'
import { hyperliquidApiGet, hyperliquidApiPost, hyperliquidApiPatch, hyperliquidApiDelete } from '@/lib/hyperliquid-api-client'

export interface StrategyPrompt {
  id: number
  name: string
  description: string
  system_prompt: string
  user_prompt_template: string
  agent_prompt: string
  is_default: boolean
  created_at: string
  updated_at: string
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return hyperliquidApiPost<T>(path, body)
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return hyperliquidApiPatch<T>(path, body)
}

async function apiDelete<T>(path: string): Promise<T> {
  return hyperliquidApiDelete<T>(path)
}

export function useStrategyPrompts(enabled: boolean = true) {
  const [prompts, setPrompts] = useState<StrategyPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const fetchedRef = useRef(false)

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await hyperliquidApiGet<{ success: boolean; data: StrategyPrompt[] }>(
        '/api/strategy_prompts'
      )
      if (res.success) {
        setPrompts(res.data)
        const def = res.data.find((p) => p.is_default)
        if (def && selectedId === null) {
          setSelectedId(def.id)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || fetchedRef.current) return
    fetchedRef.current = true
    fetchPrompts()
  }, [enabled, fetchPrompts])

  const createPrompt = useCallback(async (data: { name: string; description?: string; system_prompt: string; user_prompt_template?: string; agent_prompt?: string; is_default?: boolean }) => {
    const res = await apiPost<{ success: boolean; data: StrategyPrompt }>('/api/strategy_prompts', data)
    if (res.success) {
      await fetchPrompts()
      return res.data
    }
    return null
  }, [fetchPrompts])

  const updatePrompt = useCallback(async (id: number, data: { name?: string; description?: string; system_prompt?: string; user_prompt_template?: string; agent_prompt?: string }) => {
    const res = await apiPatch<{ success: boolean; data: StrategyPrompt }>(`/api/strategy_prompts/${id}`, data)
    if (res.success) {
      await fetchPrompts()
      return res.data
    }
    return null
  }, [fetchPrompts])

  const deletePrompt = useCallback(async (id: number) => {
    await apiDelete(`/api/strategy_prompts/${id}`)
    if (selectedId === id) setSelectedId(null)
    await fetchPrompts()
  }, [fetchPrompts, selectedId])

  const setDefault = useCallback(async (id: number) => {
    await apiPost(`/api/strategy_prompts/${id}/set-default`, {})
    setSelectedId(id)
    await fetchPrompts()
  }, [fetchPrompts])

  const selectedPrompt = prompts.find((p) => p.id === selectedId) ?? null

  return {
    prompts,
    loading,
    selectedId,
    selectedPrompt,
    setSelectedId,
    createPrompt,
    updatePrompt,
    deletePrompt,
    setDefault,
    refetch: fetchPrompts,
  }
}
