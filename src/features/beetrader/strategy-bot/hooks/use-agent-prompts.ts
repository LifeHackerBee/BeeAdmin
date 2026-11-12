import { useState, useEffect, useCallback, useRef } from 'react'
import { hyperliquidApiGet, hyperliquidApiPost, hyperliquidApiPatch, hyperliquidApiDelete } from '@/lib/hyperliquid-api-client'

export interface AgentPrompt {
  id: number
  name: string
  description: string
  system_prompt: string
  is_default: boolean
  enabled_tools: string[] | null  // null = 全部启用
  min_rr_ratio: number | null     // null = 使用默认 1.5
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

export function useAgentPrompts(enabled: boolean = true) {
  const [prompts, setPrompts] = useState<AgentPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await hyperliquidApiGet<{ success: boolean; data: AgentPrompt[] }>(
        '/api/agent_prompts'
      )
      if (res.success) {
        setPrompts(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || fetchedRef.current) return
    fetchedRef.current = true
    fetchPrompts()
  }, [enabled, fetchPrompts])

  const createPrompt = useCallback(async (data: { name: string; description?: string; system_prompt: string; is_default?: boolean; enabled_tools?: string[] | null; min_rr_ratio?: number | null }) => {
    const res = await apiPost<{ success: boolean; data: AgentPrompt }>('/api/agent_prompts', data)
    if (res.success) {
      await fetchPrompts()
      return res.data
    }
    return null
  }, [fetchPrompts])

  const updatePrompt = useCallback(async (id: number, data: { name?: string; description?: string; system_prompt?: string; enabled_tools?: string[] | null; min_rr_ratio?: number | null }) => {
    const res = await apiPatch<{ success: boolean; data: AgentPrompt }>(`/api/agent_prompts/${id}`, data)
    if (res.success) {
      await fetchPrompts()
      return res.data
    }
    return null
  }, [fetchPrompts])

  const deletePrompt = useCallback(async (id: number) => {
    await apiDelete(`/api/agent_prompts/${id}`)
    await fetchPrompts()
  }, [fetchPrompts])

  const setDefault = useCallback(async (id: number) => {
    await apiPost(`/api/agent_prompts/${id}/set-default`, {})
    await fetchPrompts()
  }, [fetchPrompts])

  const defaultPrompt = prompts.find((p) => p.is_default) ?? null

  return {
    prompts,
    loading,
    defaultPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    setDefault,
    refetch: fetchPrompts,
  }
}
