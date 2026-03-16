import { useState, useCallback, useEffect, useRef } from 'react'
import { hyperliquidApiGet } from '@/lib/hyperliquid-api-client'

export interface BotLog {
  id: number
  job_id: number
  coin: string
  level: 'info' | 'warn' | 'error' | 'trade' | 'signal'
  stage: string
  message: string
  detail: Record<string, unknown>
  created_at: string
}

interface LogsResponse {
  success: boolean
  logs: BotLog[]
}

export function useBotLogs(jobId?: number, coin?: string) {
  const [logs, setLogs] = useState<BotLog[]>([])
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (jobId != null) params.set('job_id', String(jobId))
      if (coin) params.set('coin', coin)
      const res = await hyperliquidApiGet<LogsResponse>(
        `/api/strategy_bot/jobs/logs?${params.toString()}`,
      )
      setLogs(res.logs)
    } catch {
      // silent — logs are non-critical
    }
  }, [jobId, coin])

  useEffect(() => {
    setLoading(true)
    fetchLogs().finally(() => setLoading(false))
  }, [fetchLogs])

  // auto-poll every 10s
  useEffect(() => {
    pollRef.current = setInterval(fetchLogs, 10_000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [fetchLogs])

  return { logs, loading, refetch: fetchLogs }
}
