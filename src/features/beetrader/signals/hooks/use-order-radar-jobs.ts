import { useState, useEffect, useCallback, useRef } from 'react'
import {
  hyperliquidApiGet,
  hyperliquidApiPost,
  hyperliquidApiDelete,
} from '@/lib/hyperliquid-api-client'

export interface OrderRadarJob {
  id: number
  coin: string
  status: 'running' | 'paused' | 'error'
  analyze_interval_seconds: number
  auto_simulate: boolean
  last_analyzed_at: string | null
  last_signal_action: string | null
  last_signal_confidence: number | null
  last_signal_json: Record<string, unknown> | null
  last_error: string | null
  consecutive_errors: number
  total_analyses: number
  total_signals: number
  created_at: string
  updated_at: string
}

interface ListJobsResponse {
  success: boolean
  jobs: OrderRadarJob[]
}

interface JobResponse {
  success: boolean
  job: OrderRadarJob
}

const API_PREFIX = '/api/order_radar/jobs'

export function useOrderRadarJobs() {
  const [jobs, setJobs] = useState<OrderRadarJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await hyperliquidApiGet<ListJobsResponse>(API_PREFIX)
      setJobs(res.jobs)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    }
  }, [])

  // 初始加载
  useEffect(() => {
    setLoading(true)
    fetchJobs().finally(() => setLoading(false))
  }, [fetchJobs])

  // 自动轮询: 有 running 状态的 job 时每 10s 刷新
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === 'running')
    if (hasRunning) {
      pollRef.current = setInterval(() => {
        fetchJobs()
      }, 10_000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [jobs, fetchJobs])

  const createJob = useCallback(
    async (coin: string, interval: number = 60, autoSimulate: boolean = true) => {
      try {
        const res = await hyperliquidApiPost<JobResponse>(API_PREFIX, {
          coin,
          analyze_interval_seconds: interval,
          auto_simulate: autoSimulate,
        })
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

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    startJob,
    pauseJob,
    deleteJob,
  }
}
