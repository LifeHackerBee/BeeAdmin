import { useState, useEffect, useCallback, useRef } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

export interface AgentPrompt {
  id: number
  name: string
  description: string
  system_prompt: string
  is_default: boolean
  created_at: string
  updated_at: string
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
  const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
  const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiDelete<T>(path: string): Promise<T> {
  const baseUrl = import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
  const apiKey = import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: {
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
  })
  return res.json()
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

  const createPrompt = useCallback(async (data: { name: string; description?: string; system_prompt: string; is_default?: boolean }) => {
    const res = await apiPost<{ success: boolean; data: AgentPrompt }>('/api/agent_prompts', data)
    if (res.success) {
      await fetchPrompts()
      return res.data
    }
    return null
  }, [fetchPrompts])

  const updatePrompt = useCallback(async (id: number, data: { name?: string; description?: string; system_prompt?: string }) => {
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
