import { useState, useEffect, useCallback, useRef } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

export interface SkillStep {
  label: string
  tool: string
  args: Record<string, string>
  output_key: string
  condition?: string
}

export interface SkillParam {
  name: string
  type: string
  required: boolean
  description: string
}

export interface AgentSkill {
  id: number
  name: string
  display_name: string
  description: string
  parameters: SkillParam[]
  steps: SkillStep[]
  is_builtin: boolean
  is_enabled: boolean
  created_at: string
}

const baseUrl = () => import.meta.env.VITE_HYPERLIQUID_TRADER_API_URL || 'http://localhost:8000'
const apiKey = () => import.meta.env.VITE_HYPERLIQUID_TRADER_API_KEY

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const key = apiKey()
  const res = await fetch(`${baseUrl()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'X-API-Key': key } : {}),
      ...opts.headers,
    },
  })
  return res.json()
}

export function useAgentSkills(enabled: boolean = true) {
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true)
      const res = await hyperliquidApiGet<{ success: boolean; data: AgentSkill[] }>('/api/agent_skills')
      if (res.success) setSkills(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!enabled || fetchedRef.current) return
    fetchedRef.current = true
    fetchSkills()
  }, [enabled, fetchSkills])

  const createSkill = useCallback(async (data: {
    name: string; display_name: string; description?: string;
    parameters?: SkillParam[]; steps?: SkillStep[];
  }) => {
    const res = await apiFetch<{ success: boolean; data: AgentSkill }>('/api/agent_skills', {
      method: 'POST', body: JSON.stringify(data),
    })
    if (res.success) { await fetchSkills(); return res.data }
    return null
  }, [fetchSkills])

  const updateSkill = useCallback(async (id: number, data: {
    display_name?: string; description?: string;
    parameters?: SkillParam[]; steps?: SkillStep[];
    is_enabled?: boolean;
  }) => {
    const res = await apiFetch<{ success: boolean; data: AgentSkill }>(`/api/agent_skills/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })
    if (res.success) { await fetchSkills(); return res.data }
    return null
  }, [fetchSkills])

  const deleteSkill = useCallback(async (id: number) => {
    await apiFetch(`/api/agent_skills/${id}`, { method: 'DELETE' })
    await fetchSkills()
  }, [fetchSkills])

  return { skills, loading, fetchSkills, createSkill, updateSkill, deleteSkill }
}
