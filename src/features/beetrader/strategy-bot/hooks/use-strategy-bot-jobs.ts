import { useState, useEffect, useCallback, useRef } from 'react'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiDelete,
  hyperliquidApiPatch,
} from '@/lib/hyperliquid-api-client'

export type BotMode = 'paper' | 'live'

export interface StrategyBotJob {
  id: number
  coin: string
  status: 'running' | 'paused' | 'error'
  mode: BotMode
  analyze_interval_seconds: number
  auto_trade: boolean
  last_analyzed_at: string | null
  last_signal_action: string | null
  last_signal_confidence: number | null
  last_signal_json: Record<string, unknown> | null
  last_error: string | null
  consecutive_errors: number
  total_analyses: number
  total_signals: number
  account_balance: number
  account_initial_balance: number
  has_open_position: boolean
  open_task_id: number | null
  total_trades: number
  total_pnl: number
  win_count: number
  loss_count: number
  custom_system_prompt: string | null
  custom_user_prompt: string | null
  tp_pct: number | null
  sl_pct: number | null
  taker_fee_rate: number
  maker_fee_rate: number
  max_order_usd: number
  scale_in_count: number
  scale_out_count: number
  created_at: string
  updated_at: string
}

export interface UpdateBotJobData {
  analyze_interval_seconds?: number
  auto_trade?: boolean
  custom_system_prompt?: string | null
  custom_user_prompt?: string | null
  tp_pct?: number | null
  sl_pct?: number | null
  taker_fee_rate?: number
  maker_fee_rate?: number
  max_order_usd?: number
}

export interface CreateBotJobData {
  coin: string
  analyze_interval_seconds?: number
  auto_trade?: boolean
  account_balance?: number
  mode?: BotMode
  taker_fee_rate?: number
  maker_fee_rate?: number
  max_order_usd?: number
  // 前端扩展: 创建后自动 PATCH 到 job
  custom_system_prompt?: string | null
  custom_user_prompt?: string | null
}

export interface DefaultPrompts {
  system_prompt: string
  user_prompt_template: string
  agent_prompt?: string
}

interface ListJobsResponse {
  success: boolean
  jobs: StrategyBotJob[]
}

interface JobResponse {
  success: boolean
  job: StrategyBotJob
}

const API_PREFIX = '/api/strategy_bot/jobs'

export function useStrategyBotJobs(mode?: BotMode) {
  const [jobs, setJobs] = useState<StrategyBotJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const params = mode ? `?mode=${mode}` : ''
      const res = await hyperliquidApiGet<ListJobsResponse>(`${API_PREFIX}${params}`)
      setJobs(res.jobs)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    }
  }, [mode])

  useEffect(() => {
    setLoading(true)
    fetchJobs().finally(() => setLoading(false))
  }, [fetchJobs])

  // 自动轮询: 有 running 状态的 job 时每 30s 刷新
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === 'running')
    if (hasRunning) {
      pollRef.current = setInterval(() => {
        fetchJobs()
      }, 30_000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [jobs, fetchJobs])

  const createJob = useCallback(
    async (data: CreateBotJobData) => {
      try {
        const { custom_system_prompt, custom_user_prompt, ...createData } = data
        const res = await hyperliquidApiPost<JobResponse>(API_PREFIX, createData)
        // 创建后自动应用自定义 prompt
        if (custom_system_prompt || custom_user_prompt) {
          await hyperliquidApiPatch<JobResponse>(`${API_PREFIX}/${res.job.id}`, {
            custom_system_prompt: custom_system_prompt || null,
            custom_user_prompt: custom_user_prompt || null,
          })
        }
        await fetchJobs()
        return res.job
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      }
    },
    [fetchJobs],
  )

  const startJob = useCallback(
    async (jobId: number) => {
      try {
        await hyperliquidApiPost(`${API_PREFIX}/${jobId}/start`)
        await fetchJobs()
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      }
    },
    [fetchJobs],
  )

  const pauseJob = useCallback(
    async (jobId: number) => {
      try {
        await hyperliquidApiPost(`${API_PREFIX}/${jobId}/pause`)
        await fetchJobs()
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      }
    },
    [fetchJobs],
  )

  const deleteJob = useCallback(
    async (jobId: number) => {
      try {
        await hyperliquidApiDelete(`${API_PREFIX}/${jobId}`)
        await fetchJobs()
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      }
    },
    [fetchJobs],
  )

  const resetAccount = useCallback(
    async (jobId: number) => {
      try {
        await hyperliquidApiPost(`${API_PREFIX}/${jobId}/reset-account`)
        await fetchJobs()
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      }
    },
    [fetchJobs],
  )

  const updateJob = useCallback(
    async (jobId: number, data: UpdateBotJobData) => {
      try {
        const res = await hyperliquidApiPatch<JobResponse>(`${API_PREFIX}/${jobId}`, data)
        await fetchJobs()
        return res.job
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      }
    },
    [fetchJobs],
  )

  const fetchDefaultPrompts = useCallback(async () => {
    const res = await hyperliquidApiGet<{ success: boolean } & DefaultPrompts>(
      `${API_PREFIX}/default-prompts`,
    )
    return { system_prompt: res.system_prompt, user_prompt_template: res.user_prompt_template }
  }, [])

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    startJob,
    pauseJob,
    deleteJob,
    resetAccount,
    updateJob,
    fetchDefaultPrompts,
  }
}
