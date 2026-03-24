import { useState, useCallback, useRef } from 'react'
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
  const fetchedRef = useRef(false)

  const fetchLogs = useCallback(async (forJobId?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      const jid = forJobId ?? jobId
      if (jid != null) params.set('job_id', String(jid))
      if (coin) params.set('coin', coin)
      const res = await hyperliquidApiGet<LogsResponse>(
        `/api/strategy_bot/jobs/logs?${params.toString()}`,
      )
      setLogs(res.logs)
    } catch {
      // silent — logs are non-critical
    } finally {
      setLoading(false)
    }
  }, [jobId, coin])

  // 不自动加载，不轮询。由用户点击日志按钮时触发 refetch
  const refetch = useCallback(async (forJobId?: number) => {
    fetchedRef.current = true
    await fetchLogs(forJobId)
  }, [fetchLogs])

  return { logs, loading, refetch }
}
